const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const { register, login, me } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate, registerSchema, loginSchema } = require('../validations/authValidations');

// Rate limiting: máx 10 intentos de login por IP cada 15 minutos
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Demasiados intentos. Intentá de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', authMiddleware, me);

module.exports = router;