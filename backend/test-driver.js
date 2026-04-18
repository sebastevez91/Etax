const { io } = require('socket.io-client');

// ─── Configuración ───────────────────────────────────────────
const TOKEN_DRIVER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFiZjkyOGM3LTZmZDgtNGMwOS05NWJlLTM1MTMxODMxYTQxNCIsImVtYWlsIjoiY2FybG9zQGV0YXguY29tIiwicm9sZSI6ImRyaXZlciIsImlhdCI6MTc3NTc2MjA1MywiZXhwIjoxNzc2MzY2ODUzfQ.mVgK_CUboLTK6m7-gTcActxOVYc6tvejmLzMqQeWkes';
const TRIP_ID = '072a6aa8-1cff-4667-98c1-9c0da40a3b02';
// ─────────────────────────────────────────────────────────────

const socket = io('http://localhost:3000', {
  auth: { token: TOKEN_DRIVER },
});

// Posición inicial: Obelisco
let lat = -34.603722;
let lng = -58.381592;
let locationInterval;

socket.on('connect', () => {
  console.log('[Driver] Conectado al servidor, id:', socket.id);
  socket.emit('join_trip_room', { tripId: TRIP_ID });
});

socket.on('joined_trip_room', ({ tripId }) => {
  console.log(`[Driver] Unido a sala del viaje: ${tripId}`);
  console.log('[Driver] Emitiendo ubicación cada 2 segundos...\n');

  // Emitir ubicación cada 2 segundos moviéndose hacia Recoleta
  locationInterval = setInterval(() => {
    lat += 0.0005;  // simula movimiento norte
    lng -= 0.0003;  // simula movimiento oeste

    socket.emit('driver:location', { tripId: TRIP_ID, lat, lng });
    console.log(`[Driver] Ubicación emitida → lat: ${lat.toFixed(6)}, lng: ${lng.toFixed(6)}`);
  }, 2000);
});

socket.on('error', (err) => {
  console.error('[Driver] Error:', err.message);
  clearInterval(locationInterval);
});

socket.on('disconnect', () => {
  console.log('[Driver] Desconectado del servidor');
  clearInterval(locationInterval);
});

// Detener con Ctrl+C limpiamente
process.on('SIGINT', () => {
  console.log('\n[Driver] Cerrando conexión...');
  clearInterval(locationInterval);
  socket.disconnect();
  process.exit(0);
});