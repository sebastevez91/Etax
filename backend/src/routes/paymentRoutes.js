const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  createPaymentPreference,
  handleWebhook,
  paymentSuccess,
  paymentFailure,
  paymentPending,
} = require('../controllers/paymentController');

// Webhooks — sin autenticación (MercadoPago los llama directamente)
router.post('/webhook', handleWebhook);
router.get('/success', paymentSuccess);
router.get('/failure', paymentFailure);
router.get('/pending', paymentPending);

// Crear preferencia de pago — requiere auth
router.post('/trip/:tripId', authMiddleware, createPaymentPreference);

module.exports = router;