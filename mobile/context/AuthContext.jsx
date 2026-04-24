import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Al arrancar la app, revisamos si hay sesión guardada
  useEffect(() => {
    const restore = async () => {
      try {
        const savedToken        = await AsyncStorage.getItem('token');
        const savedRefreshToken = await AsyncStorage.getItem('refreshToken');

        if (savedToken) {
          setToken(savedToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;

          try {
            const res = await api.get('/auth/me');
            setUser(res.data.data.user);
          } catch (err) {
            // Si el access token expiró, intentamos renovarlo
            if (err.response?.data?.code === 'TOKEN_EXPIRED' && savedRefreshToken) {
              try {
                const refreshRes = await api.post('/auth/refresh', {
                  refreshToken: savedRefreshToken,
                });
                const { token: newToken, refreshToken: newRefresh } = refreshRes.data.data;

                await AsyncStorage.setItem('token', newToken);
                await AsyncStorage.setItem('refreshToken', newRefresh);
                api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                setToken(newToken);

                const meRes = await api.get('/auth/me');
                setUser(meRes.data.data.user);
              } catch {
                // Refresh también falló — limpiar sesión
                await clearSession();
              }
            } else {
              await clearSession();
            }
          }
        }
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const clearSession = async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken']);
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: jwt, refreshToken, user: userData } = res.data.data;

    await AsyncStorage.setItem('token', jwt);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    setToken(jwt);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      // Llamar al endpoint de logout para blacklistear los tokens
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // Si falla el logout en el servidor, igual limpiamos local
    } finally {
      await clearSession();
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);