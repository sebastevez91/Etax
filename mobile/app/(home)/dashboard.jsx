import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const INITIAL_REGION = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const mapRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
    setLocation(coords);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 1000);
  };

  const handleRequestTrip = async () => {
    if (!destination.trim()) {
      Alert.alert('Error', 'Ingresá un destino');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Esperando ubicación...');
      return;
    }
    try {
      setRequesting(true);
      const res = await api.post('/trips', {
        originLat: location.latitude,
        originLng: location.longitude,
        originAddress: 'Mi ubicación actual',
        destinationLat: location.latitude - 0.01, // placeholder
        destinationLng: location.longitude - 0.01,
        destinationAddress: destination.trim(),
      });
      setActiveTrip(res.data.trip);
      Alert.alert('¡Viaje solicitado!', 'Buscando conductor...');
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al solicitar el viaje';
      Alert.alert('Error', msg);
    } finally {
      setRequesting(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.patch(`/trips/${activeTrip.id}/status`, { status: 'cancelled' });
      setActiveTrip(null);
    } catch {
      Alert.alert('Error', 'No se pudo cancelar el viaje');
    }
  };

  return (
    <View style={styles.container}>
      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {location && (
          <Marker coordinate={location} title="Tu ubicación" pinColor="#e94560" />
        )}
      </MapView>

      {/* Panel inferior */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.panel}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {activeTrip ? (
          <View style={styles.activeTrip}>
            <Text style={styles.activeTripTitle}>🚕 Viaje en curso</Text>
            <Text style={styles.activeTripSub}>Destino: {activeTrip.destinationAddress}</Text>
            <Text style={styles.activeTripStatus}>Estado: {activeTrip.status}</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTrip}>
              <Text style={styles.cancelText}>Cancelar viaje</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.label}>¿A dónde vas?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresá tu destino"
              placeholderTextColor="#888"
              value={destination}
              onChangeText={setDestination}
            />
            <TouchableOpacity
              style={[styles.button, requesting && styles.buttonDisabled]}
              onPress={handleRequestTrip}
              disabled={requesting}
            >
              {requesting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Pedir ETax</Text>
              }
            </TouchableOpacity>
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { color: '#fff', fontSize: 18, fontWeight: '700' },
  logoutText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: '#0f3460',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  activeTrip: {
    backgroundColor: '#0f3460',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  activeTripTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activeTripSub: { color: '#aaa', fontSize: 14 },
  activeTripStatus: { color: '#e94560', fontSize: 13, fontWeight: '600' },
  cancelButton: {
    marginTop: 8,
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelText: { color: '#fff', fontWeight: '700' },
});