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
  },
  driverId: {
    type: DataTypes.UUID,
  },
  status: {
    type: DataTypes.ENUM('searching', 'accepted', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'searching',
  },
  originLat:      { type: DataTypes.FLOAT },
  originLng:      { type: DataTypes.FLOAT },
  originAddress:  { type: DataTypes.STRING },
  destLat:        { type: DataTypes.FLOAT },
  destLng:        { type: DataTypes.FLOAT },
  destAddress:    { type: DataTypes.STRING },
  estimatedPrice: { type: DataTypes.FLOAT },
  finalPrice:     { type: DataTypes.FLOAT },
});

module.exports = Trip;