import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.0.9:3000';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  });

  socket.on('connect', () => console.log('🟢 Socket conectado:', socket.id));
  socket.on('disconnect', () => console.log('🔴 Socket desconectado'));
  socket.on('connect_error', (err) => console.log('❌ Socket error:', err.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};