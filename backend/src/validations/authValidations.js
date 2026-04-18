const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(80).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'any.required': 'El nombre es requerido',
  }),
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'El email es requerido',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.base': 'La contraseña debe tener mayúsculas, minúsculas y números',
      'any.required': 'La contraseña es requerida',
    }),
  role: Joi.string().valid('passenger', 'driver', 'admin').default('passenger'), // ← roles reales
  phone: Joi.string().pattern(/^\+?[\d\s\-()]{8,15}$/).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'El email es requerido',
  }),
  password: Joi.string().required().messages({
    'any.required': 'La contraseña es requerida',
  }),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path[0],
      message: d.message,
    }));
    return res.status(422).json({ success: false, errors });
  }
  req.body = value;
  next();
};

module.exports = { registerSchema, loginSchema, validate };