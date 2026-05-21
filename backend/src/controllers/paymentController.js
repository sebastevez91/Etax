const { preference, payment } = require('../services/mercadopagoClient');
const { Trip } = require('../models');

// Crear preferencia de pago para un viaje
const createPaymentPreference = async (req, res) => {
  try {
    const { tripId } = req.params;
    const userId = req.user.id;

    const trip = await Trip.findByPk(tripId);
    if (!trip) return res.status(404).json({ error: 'Viaje no encontrado' });
    if (trip.passengerId !== userId) return res.status(403).json({ error: 'No autorizado' });
    if (trip.status !== 'completed') return res.status(400).json({ error: 'El viaje no está completado' });

    const result = await preference.create({
      body: {
        items: [
          {
            id: trip.id,
            title: `Viaje ETax #${trip.id.slice(0, 8)}`,
            quantity: 1,
            unit_price: Number(trip.finalPrice || trip.estimatedPrice),
            currency_id: 'ARS',
          },
        ],
        external_reference: trip.id,
        back_urls: {
          success: `https://etax-backend-23a4.onrender.com/api/payments/success`,
          failure: `https://etax-backend-23a4.onrender.com/api/payments/failure`,
          pending: `https://etax-backend-23a4.onrender.com/api/payments/pending`,
        },
        auto_return: 'approved',
      },
    });

    return res.json({
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    });
  } catch (err) {
    console.error('createPaymentPreference error:', err);
    return res.status(500).json({ error: 'Error al crear preferencia de pago' });
  }
};

// Webhook — MercadoPago notifica el resultado del pago
const handleWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== 'payment') return res.sendStatus(200);

    const paymentData = await payment.get({ id: data.id });
    const tripId = paymentData.external_reference;
    const status = paymentData.status; // approved, rejected, pending

    if (status === 'approved') {
      await Trip.update({ paymentStatus: 'paid' }, { where: { id: tripId } });
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('handleWebhook error:', err);
    return res.sendStatus(500);
  }
};

// Callbacks de redirección
const paymentSuccess = (req, res) => res.json({ message: 'Pago exitoso', query: req.query });
const paymentFailure = (req, res) => res.json({ message: 'Pago fallido', query: req.query });
const paymentPending = (req, res) => res.json({ message: 'Pago pendiente', query: req.query });

module.exports = {
  createPaymentPreference,
  handleWebhook,
  paymentSuccess,
  paymentFailure,
  paymentPending,
};