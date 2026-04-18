const { verifyToken } = require('../services/jwtService');
const { Trip } = require('../models');

const registerTripSockets = (io) => {

  // Middleware de autenticación para Socket.io
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Token requerido'));

      const decoded = verifyToken(token);
      socket.user = decoded; // { id, email, role }
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Conectado: ${socket.user.email} (${socket.user.role}) — ${socket.id}`);

    // El cliente se une a la sala de un viaje específico
    socket.on('join_trip_room', async ({ tripId }) => {
      try {
        const trip = await Trip.findByPk(tripId);
        if (!trip) return socket.emit('error', { message: 'Viaje no encontrado' });

        // Solo el passenger, el driver asignado o admin pueden unirse
        const canJoin =
          trip.passengerId === socket.user.id ||
          trip.driverId === socket.user.id ||
          socket.user.role === 'admin';

        if (!canJoin) return socket.emit('error', { message: 'Sin acceso a este viaje' });

        socket.join(`trip:${tripId}`);
        socket.emit('joined_trip_room', { tripId });
        console.log(`[Socket] ${socket.user.email} unido a sala trip:${tripId}`);
      } catch (err) {
        console.error('[Socket] join_trip_room error:', err.message);
        socket.emit('error', { message: 'Error al unirse a la sala' });
      }
    });

    // El driver emite su ubicación en tiempo real
    socket.on('driver:location', ({ tripId, lat, lng }) => {
      if (socket.user.role !== 'driver') return;

      // Rebroadcast a todos en la sala excepto al driver que envió
      socket.to(`trip:${tripId}`).emit('driver:location', {
        tripId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('leave_trip_room', ({ tripId }) => {
      socket.leave(`trip:${tripId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Desconectado: ${socket.user?.email} — ${socket.id}`);
    });
  });
};

module.exports = { registerTripSockets };