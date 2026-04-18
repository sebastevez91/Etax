const { Trip, User } = require('../models');
const { Op } = require('sequelize');

// Máquina de estados: qué transiciones son válidas y quién las puede hacer
const TRANSITIONS = {
  accepted:    { from: 'requested',   role: 'driver' },
  in_progress: { from: 'accepted',    role: 'driver' },
  completed:   { from: 'in_progress', role: 'driver' },
  cancelled:   { from: ['requested', 'accepted'], role: 'any' },
};

// Precio estimado simple: tarifa base + precio por km
const estimatePrice = (originLat, originLng, destLat, destLng) => {
  const R = 6371;
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLng = ((destLng - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((originLat * Math.PI) / 180) *
    Math.cos((destLat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const BASE_FARE = 500;   // en la moneda que uses
  const PER_KM    = 200;
  return { distanceKm: +distanceKm.toFixed(2), estimatedPrice: +(BASE_FARE + distanceKm * PER_KM).toFixed(2) };
};

// POST /api/trips  — solo passengers
const createTrip = async (req, res) => {
  try {
    if (req.user.role !== 'passenger') {
      return res.status(403).json({ success: false, message: 'Solo los pasajeros pueden solicitar viajes' });
    }

    const { originLat, originLng, originAddress, destLat, destLng, destAddress } = req.body;
    const { distanceKm, estimatedPrice } = estimatePrice(originLat, originLng, destLat, destLng);

    const trip = await Trip.create({
      passengerId: req.user.id,
      originLat, originLng, originAddress,
      destLat, destLng, destAddress,
      distanceKm, estimatedPrice,
      status: 'requested',
    });

    return res.status(201).json({ success: true, data: { trip } });
  } catch (error) {
    console.error('[tripController.createTrip]', error);
    return res.status(500).json({ success: false, message: 'Error al crear el viaje' });
  }
};

// GET /api/trips  — historial según rol
const getTrips = async (req, res) => {
  try {
    const where = req.user.role === 'driver'
      ? { driverId: req.user.id }
      : { passengerId: req.user.id };

    const trips = await Trip.findAll({
      where,
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'name', 'phone', 'rating'] },
        { model: User, as: 'driver',    attributes: ['id', 'name', 'phone', 'rating'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ success: true, data: { trips } });
  } catch (error) {
    console.error('[tripController.getTrips]', error);
    return res.status(500).json({ success: false, message: 'Error al obtener viajes' });
  }
};

// GET /api/trips/available  — solo drivers: viajes en requested sin driver
const getAvailableTrips = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Solo los conductores pueden ver viajes disponibles' });
    }

    const trips = await Trip.findAll({
      where: { status: 'requested', driverId: null },
      include: [{ model: User, as: 'passenger', attributes: ['id', 'name', 'rating'] }],
      order: [['createdAt', 'ASC']],
    });

    return res.status(200).json({ success: true, data: { trips } });
  } catch (error) {
    console.error('[tripController.getAvailableTrips]', error);
    return res.status(500).json({ success: false, message: 'Error al obtener viajes disponibles' });
  }
};

// GET /api/trips/:id
const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, {
      include: [
        { model: User, as: 'passenger', attributes: ['id', 'name', 'phone', 'rating'] },
        { model: User, as: 'driver',    attributes: ['id', 'name', 'phone', 'rating'] },
      ],
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Viaje no encontrado' });
    }

    // Solo el passenger, el driver asignado o un admin pueden verlo
    const isOwner =
      trip.passengerId === req.user.id ||
      trip.driverId === req.user.id ||
      req.user.role === 'admin';

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Sin acceso a este viaje' });
    }

    return res.status(200).json({ success: true, data: { trip } });
  } catch (error) {
    console.error('[tripController.getTripById]', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el viaje' });
  }
};

// PATCH /api/trips/:id/status  — transiciones de estado
const updateTripStatusFactory = (io) => async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Viaje no encontrado' });
    }

    const { status, cancelReason } = req.body;
    const transition = TRANSITIONS[status];

    if (!transition) {
      return res.status(400).json({ success: false, message: `Transición a '${status}' no permitida` });
    }

    const validFrom = Array.isArray(transition.from)
      ? transition.from.includes(trip.status)
      : trip.status === transition.from;

    if (!validFrom) {
      return res.status(400).json({
        success: false,
        message: `No se puede cambiar de '${trip.status}' a '${status}'`,
      });
    }

    if (transition.role !== 'any' && req.user.role !== transition.role) {
      return res.status(403).json({
        success: false,
        message: `Solo un ${transition.role} puede hacer esta transición`,
      });
    }

    const now = new Date();
    trip.status = status;

    if (status === 'accepted') {
      trip.driverId   = req.user.id;
      trip.acceptedAt = now;
    }
    if (status === 'in_progress') trip.startedAt   = now;
    if (status === 'completed') {
      trip.completedAt = now;
      trip.finalPrice  = trip.estimatedPrice;
    }
    if (status === 'cancelled') {
      trip.cancelledAt  = now;
      trip.cancelledBy  = req.user.role;
      trip.cancelReason = cancelReason || null;
    }

    await trip.save();

    // Emitir a todos en la sala del viaje
    io.to(`trip:${trip.id}`).emit('trip:updated', {
      tripId:   trip.id,
      status:   trip.status,
      driverId: trip.driverId,
      updatedAt: now.toISOString(),
    });

    return res.status(200).json({ success: true, data: { trip } });
  } catch (error) {
    console.error('[tripController.updateTripStatus]', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el estado' });
  }
};

const rateTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Viaje no encontrado' });
    }

    // Solo se puede calificar un viaje completado
    if (trip.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Solo podés calificar viajes completados',
      });
    }

    const { rating, comment } = req.body;
    const userId = req.user.id;
    const role   = req.user.role;

    // Determinar quién califica a quién
    let targetUserId;

    if (role === 'passenger') {
      // El passenger califica al driver
      if (trip.passengerId !== userId) {
        return res.status(403).json({ success: false, message: 'No sos el pasajero de este viaje' });
      }
      if (trip.ratingByPassenger !== null) {
        return res.status(409).json({ success: false, message: 'Ya calificaste este viaje' });
      }
      trip.ratingByPassenger     = rating;
      trip.ratingPassengerComment = comment || null;
      targetUserId = trip.driverId;

    } else if (role === 'driver') {
      // El driver califica al passenger
      if (trip.driverId !== userId) {
        return res.status(403).json({ success: false, message: 'No sos el conductor de este viaje' });
      }
      if (trip.ratingByDriver !== null) {
        return res.status(409).json({ success: false, message: 'Ya calificaste este viaje' });
      }
      trip.ratingByDriver     = rating;
      trip.ratingDriverComment = comment || null;
      targetUserId = trip.passengerId;

    } else {
      return res.status(403).json({ success: false, message: 'Solo passengers y drivers pueden calificar' });
    }

    await trip.save();

    // Recalcular el promedio del usuario calificado
    const ratingField = role === 'passenger' ? 'ratingByPassenger' : 'ratingByDriver';

    const { count, rows } = await Trip.findAndCountAll({
      where: {
        [role === 'passenger' ? 'driverId' : 'passengerId']: targetUserId,
        status: 'completed',
        [ratingField]: { [Op.not]: null },
      },
      attributes: [ratingField],
    });

    const newAverage = rows.reduce((sum, t) => sum + t[ratingField], 0) / count;

    await User.update(
      { rating: +newAverage.toFixed(2) },
      { where: { id: targetUserId } }
    );

    return res.status(200).json({
      success: true,
      message: 'Calificación registrada',
      data: {
        tripId:     trip.id,
        rating,
        comment:    comment || null,
        newAverage: +newAverage.toFixed(2),
      },
    });
  } catch (error) {
    console.error('[tripController.rateTrip]', error);
    return res.status(500).json({ success: false, message: 'Error al calificar el viaje' });
  }
};

module.exports = (io) => ({
  createTrip,
  getTrips,
  getAvailableTrips,
  getTripById,
  updateTripStatus: updateTripStatusFactory(io),
  rateTrip,
});