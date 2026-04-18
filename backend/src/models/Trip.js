const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trip = sequelize.define('Trip', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  passengerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
  },
  status: {
    type: DataTypes.ENUM(
      'requested',
      'accepted',
      'in_progress',
      'completed',
      'cancelled'
    ),
    defaultValue: 'requested',
  },
  // Origen
  originLat: { type: DataTypes.FLOAT, allowNull: false },
  originLng: { type: DataTypes.FLOAT, allowNull: false },
  originAddress: { type: DataTypes.STRING, allowNull: false },
  // Destino
  destLat: { type: DataTypes.FLOAT, allowNull: false },
  destLng: { type: DataTypes.FLOAT, allowNull: false },
  destAddress: { type: DataTypes.STRING, allowNull: false },
  // Precios y distancia
  estimatedPrice: { type: DataTypes.FLOAT, allowNull: true },
  finalPrice: { type: DataTypes.FLOAT, allowNull: true },
  distanceKm: { type: DataTypes.FLOAT, allowNull: true },
  // Timestamps de estado
  acceptedAt: { type: DataTypes.DATE, allowNull: true },
  startedAt: { type: DataTypes.DATE, allowNull: true },
  completedAt: { type: DataTypes.DATE, allowNull: true },
  cancelledAt: { type: DataTypes.DATE, allowNull: true },
  cancelledBy: {
    type: DataTypes.ENUM('passenger', 'driver', 'admin'),
    allowNull: true,
  },
  cancelReason: { type: DataTypes.STRING, allowNull: true },
  ratingByPassenger: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  ratingByDriver: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
  },
  ratingPassengerComment: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
  ratingDriverComment: {
    type: DataTypes.STRING(300),
    allowNull: true,
  },
});

module.exports = Trip;