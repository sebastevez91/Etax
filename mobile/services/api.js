import axios from 'axios';

const api = axios.create({
  // Tu IP local — la que aparece en el QR: exp://192.168.0.10:8081
  // Usamos el puerto de tu backend Express
  baseURL: 'http://192.168.0.10:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;