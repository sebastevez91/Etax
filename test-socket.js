const { io } = require('socket.io-client');

const TOKEN = 'PEGÁ_AQUÍ_EL_JWT_DEL_PASSENGER';
const TRIP_ID = 'PEGÁ_AQUÍ_EL_ID_DEL_VIAJE';

const socket = io('http://localhost:3000', {
  auth: { token: TOKEN },
});

socket.on('connect', () => {
  console.log('Conectado como passenger, id:', socket.id);
  socket.emit('join_trip_room', { tripId: TRIP_ID });
});

socket.on('joined_trip_room', (data) => {
  console.log('Unido a sala:', data);
});

socket.on('trip:updated', (data) => {
  console.log('>>> Estado actualizado:', data);
});

socket.on('driver:location', (data) => {
  console.log('>>> Ubicación del driver:', data);
});

socket.on('error', (err) => {
  console.error('Error socket:', err);
});