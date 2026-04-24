import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://192.168.0.9:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de respuesta — renueva el token automáticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es TOKEN_EXPIRED y no reintentamos ya
    if (
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) return Promise.reject(error);

        const refreshRes = await api.post('/auth/refresh', { refreshToken });
        const { token: newToken, refreshToken: newRefresh } = refreshRes.data.data;

        // Guardar nuevos tokens
        await AsyncStorage.setItem('token', newToken);
        await AsyncStorage.setItem('refreshToken', newRefresh);

        // Actualizar header y reintentar el request original
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

        return api(originalRequest);
      } catch {
        // Refresh falló — limpiar sesión
        await AsyncStorage.multiRemove(['token', 'refreshToken']);
        delete api.defaults.headers.common['Authorization'];
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;