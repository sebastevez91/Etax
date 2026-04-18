const Joi = require('joi');

const createTripSchema = Joi.object({
  originLat:     Joi.number().min(-90).max(90).required(),
  originLng:     Joi.number().min(-180).max(180).required(),
  originAddress: Joi.string().min(3).max(255).required(),
  destLat:       Joi.number().min(-90).max(90).required(),
  destLng:       Joi.number().min(-180).max(180).required(),
  destAddress:   Joi.string().min(3).max(255).required(),
});

const updateStatusSchema = Joi.object({
  status:       Joi.string().valid('accepted', 'in_progress', 'completed', 'cancelled').required(),
  cancelReason: Joi.string().max(255).when('status', {
    is: 'cancelled',
    then: Joi.optional(),
    otherwise: Joi.forbidden(),
  }),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => ({ field: d.path[0], message: d.message }));
    return res.status(422).json({ success: false, errors });
  }
  req.body = value;
  next();
};

const ratingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'El rating mínimo es 1',
    'number.max': 'El rating máximo es 5',
    'any.required': 'El rating es requerido',
  }),
  comment: Joi.string().max(300).optional().allow(''),
});

module.exports = { createTripSchema, updateStatusSchema, ratingSchema, validate };