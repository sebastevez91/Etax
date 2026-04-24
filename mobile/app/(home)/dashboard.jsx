import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, TextInput
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../../services/socket';

export default function DashboardScreen() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const mapRef = useRef(null);

  const [location, setLocation]           = useState(null);
  const [destination, setDestination]     = useState('');
  const [destCoords, setDestCoords]       = useState(null);
  const [loading, setLoading]             = useState(false);
  const [activeTrip, setActiveTrip]       = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);

  // Conectar socket al montar
  useEffect(() => {
    const socket = connectSocket(token);

    // Escuchar ubicación del conductor
    socket.on('driver:location', ({ lat, lng }) => {
      console.log('📍 Ubicación del conductor recibida:', lat, lng);
      setDriverLocation({ latitude: lat, longitude: lng });
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  // Obtener GPS del pasajero
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  // Si hay viaje activo al montar, unirse a la sala
  useEffect(() => {
    if (activeTrip) {
      const socket = getSocket();
      socket.emit('join_trip_room', { tripId: activeTrip.id });
      socket.on('joined_trip_room', ({ tripId }) => {
        console.log('🛻 Pasajero unido a sala:', tripId);
      });
    }
  }, [activeTrip]);

  const requestTrip = async () => {
    if (!location) return Alert.alert('Error', 'Esperando tu ubicación...');
    if (!destination.trim()) return Alert.alert('Error', 'Ingresá un destino.');

    // Destino simulado: sumamos 0.01 grado al norte como demo
    const dest = {
      lat: location.latitude + 0.01,
      lng: location.longitude + 0.01,
    };
    setDestCoords({ latitude: dest.lat, longitude: dest.lng });

    try {
      setLoading(true);
      const res = await api.post('/trips', {
        originLat:    location.latitude,
        originLng:    location.longitude,
        destLat:      dest.lat,
        destLng:      dest.lng,
        originAddress:  'Mi ubicación',
        destAddress:    destination.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const trip = res.data.data;
      setActiveTrip(trip);
      Alert.alert('¡Viaje solicitado!', `Precio estimado: $${trip.estimatedPrice}`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo solicitar el viaje.');
    } finally {
      setLoading(false);
    }
  };

  const cancelTrip = async () => {
    if (!activeTrip) return;
    try {
      await api.patch(`/trips/${activeTrip.id}/status`,
        { status: 'cancelled' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveTrip(null);
      setDriverLocation(null);
      setDestCoords(null);
      setDestination('');
      Alert.alert('Viaje cancelado.');
    } catch (err) {
      Alert.alert('Error', 'No se pudo cancelar el viaje.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ETax</Text>
        <TouchableOpacity onPress={async () => {
            await logout();
            router.replace('/(auth)/login');
          }}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Mapa */}
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={location}
          showsUserLocation
        >
          {/* Marcador destino */}
          {destCoords && (
            <Marker coordinate={destCoords} title="Destino" pinColor="#6366f1" />
          )}

          {/* Marcador conductor en tiempo real */}
          {driverLocation && (
            <Marker
              coordinate={driverLocation}
              title="Tu conductor"
              description="Ubicación en tiempo real"
            >
              <View style={styles.driverMarker}>
                <Text style={styles.driverMarkerText}>🚗</Text>
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={styles.mapPlaceholderText}>Obteniendo ubicación...</Text>
        </View>
      )}

      {/* Panel inferior */}
      <View style={styles.panel}>
        {!activeTrip ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="¿A dónde vas?"
              placeholderTextColor="#64748b"
              value={destination}
              onChangeText={setDestination}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={requestTrip}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Solicitar viaje</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.tripStatus}>
            <Text style={styles.tripStatusTitle}>
              {driverLocation ? '🚗 Conductor en camino' : '⏳ Buscando conductor...'}
            </Text>
            <Text style={styles.tripStatusSub}>
              Destino: {activeTrip.destinationAddress}
            </Text>
            {driverLocation && (
              <Text style={styles.tripStatusCoords}>
                📍 {driverLocation.latitude.toFixed(5)}, {driverLocation.longitude.toFixed(5)}
              </Text>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={cancelTrip}>
              <Text style={styles.cancelButtonText}>Cancelar viaje</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#0f172a' },
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#1e293b' },
  title:                { fontSize: 22, fontWeight: '800', color: '#fff' },
  logout:               { color: '#f87171', fontWeight: '600' },
  map:                  { flex: 1 },
  mapPlaceholder:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPlaceholderText:   { color: '#64748b', fontSize: 14 },
  panel:                { backgroundColor: '#1e293b', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#334155' },
  input:                { backgroundColor: '#0f172a', color: '#fff', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 12 },
  button:               { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonDisabled:       { opacity: 0.6 },
  buttonText:           { color: '#fff', fontWeight: '700', fontSize: 16 },
  tripStatus:           { alignItems: 'center', gap: 8 },
  tripStatusTitle:      { color: '#fff', fontWeight: '800', fontSize: 18 },
  tripStatusSub:        { color: '#94a3b8', fontSize: 14 },
  tripStatusCoords:     { color: '#6366f1', fontSize: 12, fontFamily: 'monospace' },
  cancelButton:         { backgroundColor: '#7f1d1d', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', marginTop: 8 },
  cancelButtonText:     { color: '#fca5a5', fontWeight: '700' },
  driverMarker:         { backgroundColor: '#6366f1', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: '#fff' },
  driverMarkerText:     { fontSize: 18 },
});