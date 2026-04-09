const sequelize = require('../config/database');
const User = require('./User');
const Trip = require('./Trip');

// Relaciones
User.hasMany(Trip, { foreignKey: 'passengerId', as: 'tripsAsPassenger' });
User.hasMany(Trip, { foreignKey: 'driverId', as: 'tripsAsDriver' });
Trip.belongsTo(User, { foreignKey: 'passengerId', as: 'passenger' });
Trip.belongsTo(User, { foreignKey: 'driverId', as: 'driver' });

module.exports = { sequelize, User, Trip };