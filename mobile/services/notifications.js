import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configurar cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Registrar el dispositivo y obtener el push token
export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('⚠️ Push notifications solo funcionan en dispositivo físico');
    return null;
  }

  // Pedir permisos
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('⚠️ Permiso de notificaciones denegado');
    return null;
  }

  // Obtener el Expo Push Token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: 'fc12d7be-2be7-4544-aaad-a8ae5e6cc371', 
  });

  const pushToken = tokenData.data;
  console.log('📱 Push token:', pushToken);

  // Configuración extra para Android
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  // Enviar el token al backend para guardarlo
  try {
    await api.post('/auth/push-token', { pushToken });
    console.log('✅ Push token guardado en backend');
  } catch (err) {
    console.error('❌ Error guardando push token:', err.message);
  }

  return pushToken;
};