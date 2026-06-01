import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.0.9:3000';
//const SOCKET_URL = 'https://etax-backend-23a4.onrender.com';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'], // ← polling primero, luego upgrade
    reconnection: true,
  });

  socket.on('connect', () => console.log('🟢 Socket conectado:', socket.id));
  socket.on('disconnect', () => console.log('🔴 Socket desconectado'));
  socket.on('connect_error', (err) => console.log('❌ Socket error:', err.message));
  socket.on('disconnect', (reason) => console.log('🔴 Socket desconectado:', reason));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};