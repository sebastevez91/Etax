const { io } = require('socket.io-client');

// ─── Configuración ───────────────────────────────────────────
const TOKEN_PASSENGER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU0ZTg0MDJmLWZmMGEtNDgyNi1iNGIwLTg4ZDFiM2U5ZTk4NyIsImVtYWlsIjoiYW5hQGV0YXguY29tIiwicm9sZSI6InBhc3NlbmdlciIsImlhdCI6MTc3NTc2MjA1MSwiZXhwIjoxNzc2MzY2ODUxfQ.O1xJ1Me_ORBzWGZBAgFZ7uaxyseH3JTemNtVV0P4MZQ';
const TRIP_ID = '072a6aa8-1cff-4667-98c1-9c0da40a3b02';
// ─────────────────────────────────────────────────────────────

const socket = io('http://localhost:3000', {
  auth: { token: TOKEN_PASSENGER },
});

socket.on('connect', () => {
  console.log('[Passenger] Conectado al servidor, id:', socket.id);
  socket.emit('join_trip_room', { tripId: TRIP_ID });
});

socket.on('joined_trip_room', ({ tripId }) => {
  console.log(`[Passenger] Unido a sala del viaje: ${tripId}`);
  console.log('[Passenger] Esperando eventos del driver...\n');
});

socket.on('trip:updated', (data) => {
  console.log('[Passenger] >>> Estado del viaje actualizado:');
  console.log(`             status: ${data.status}`);
  console.log(`             driverId: ${data.driverId}`);
  console.log(`             updatedAt: ${data.updatedAt}\n`);
});

socket.on('driver:location', (data) => {
  console.log('[Passenger] >>> Ubicación del driver:');
  console.log(`             lat: ${data.lat}, lng: ${data.lng}`);
  console.log(`             timestamp: ${data.timestamp}\n`);
});

socket.on('error', (err) => {
  console.error('[Passenger] Error:', err.message);
});

socket.on('disconnect', () => {
  console.log('[Passenger] Desconectado del servidor');
});