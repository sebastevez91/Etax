const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validate, createTripSchema, updateStatusSchema, ratingSchema } = require('../validations/tripValidations');

module.exports = (io) => {
  const router = express.Router();
  const {
    createTrip,
    getTrips,
    getAvailableTrips,
    getTripById,
    updateTripStatus,
    rateTrip,
  } = require('../controllers/tripController')(io);

  router.use(authMiddleware);

  router.post('/',              validate(createTripSchema),   createTrip);
  router.get('/',                                             getTrips);
  router.get('/available',                                    getAvailableTrips);
  router.get('/:id',                                          getTripById);
  router.patch('/:id/status',  validate(updateStatusSchema),  updateTripStatus);
  router.post('/:id/rating',   validate(ratingSchema),        rateTrip);

  return router;
};