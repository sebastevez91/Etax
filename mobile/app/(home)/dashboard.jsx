import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Keyboard, ScrollView
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../../services/socket';
import AddressAutocomplete from '../../components/AddressAutocomplete';

export default function DashboardScreen() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const mapRef = useRef(null);
  const activeTripRef = useRef(null);

  const [location, setLocation]           = useState(null);
  const [destination, setDestination]     = useState('');
  const [destCoords, setDestCoords]       = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [activeTrip, setActiveTrip]       = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [keyboardOpen, setKeyboardOpen]   = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const socket = connectSocket(token);
    socket.on('driver:location', ({ lat, lng }) => {
      setDriverLocation({ latitude: lat, longitude: lng });
    });
    socket.on('trip:updated', (updatedTrip) => {
      if (updatedTrip.status === 'completed') {
        router.replace(`/(app)/rate?tripId=${updatedTrip.tripId}&ratedRole=driver`);
      }
    });
    return () => { disconnectSocket(); };
  }, []);

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

  useEffect(() => {
    if (!activeTrip) return;
    activeTripRef.current = activeTrip;
    const socket = getSocket();
    const joinRoom = () => socket.emit('join_trip_room', { tripId: activeTrip.id });
    if (socket?.connected) joinRoom();
    else socket.once('connect', joinRoom);
    socket.on('joined_trip_room', ({ tripId }) => console.log('🛻 Unido a sala:', tripId));
    return () => {
      socket.off('connect', joinRoom);
      socket.off('joined_trip_room');
    };
  }, [activeTrip]);

  const requestTrip = async () => {
    if (!location) return Alert.alert('Error', 'Esperando tu ubicación...');
    if (!selectedPlace) return Alert.alert('Error', 'Seleccioná un destino de la lista.');
    const dest = { lat: selectedPlace.lat, lng: selectedPlace.lng };
    setDestCoords({ latitude: dest.lat, longitude: dest.lng });
    try {
      setLoading(true);
      const res = await api.post('/trips', {
        originLat:     location.latitude,
        originLng:     location.longitude,
        destLat:       dest.lat,
        destLng:       dest.lng,
        originAddress: 'Mi ubicación',
        destAddress:   destination.trim(),
      });
      const trip = res.data.data.trip;
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
      await api.patch(`/trips/${activeTrip.id}/status`, { status: 'cancelled' });
      setActiveTrip(null);
      setDriverLocation(null);
      setDestCoords(null);
      setDestination('');
      setSelectedPlace(null);
      Alert.alert('Viaje cancelado.');
    } catch {
      Alert.alert('Error', 'No se pudo cancelar el viaje.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ETax</Text>
        <TouchableOpacity onPress={async () => { await logout(); router.replace('/(auth)/login'); }}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Mapa — se achica cuando el teclado está abierto */}
      {location ? (
        <MapView
          ref={mapRef}
          style={keyboardOpen ? styles.mapSmall : styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={location}
          showsUserLocation
        >
          {destCoords && <Marker coordinate={destCoords} title="Destino" pinColor="#6366f1" />}
          {driverLocation && (
            <Marker coordinate={driverLocation} title="Tu conductor">
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
      <ScrollView
        style={styles.panel}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.panelContent}
      >
        <TouchableOpacity style={styles.historyButton} onPress={() => router.push('/(app)/history')}>
          <Text style={styles.historyButtonText}>Ver mis viajes</Text>
        </TouchableOpacity>

        {!activeTrip ? (
          <>
            <AddressAutocomplete
              placeholder="¿A dónde vas?"
              onSelect={(place) => {
                setSelectedPlace(place);
                setDestination(place.name);
                setDestCoords({ latitude: place.lat, longitude: place.lng });
                mapRef.current?.animateToRegion({
                  latitude: place.lat,
                  longitude: place.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }, 800);
              }}
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
            <Text style={styles.tripStatusSub}>Destino: {activeTrip.destAddress}</Text>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0f172a' },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#1e293b' },
  title:              { fontSize: 22, fontWeight: '800', color: '#fff' },
  logout:             { color: '#f87171', fontWeight: '600' },
  map:                { flex: 1 },
  mapSmall:           { height: 180 },
  mapPlaceholder:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPlaceholderText: { color: '#64748b', fontSize: 14 },
  panel:              { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: '#334155', maxHeight: '55%' },
  panelContent:       { padding: 20, paddingBottom: 32 },
  button:             { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonDisabled:     { opacity: 0.6 },
  buttonText:         { color: '#fff', fontWeight: '700', fontSize: 16 },
  tripStatus:         { alignItems: 'center', gap: 8 },
  tripStatusTitle:    { color: '#fff', fontWeight: '800', fontSize: 18 },
  tripStatusSub:      { color: '#94a3b8', fontSize: 14 },
  tripStatusCoords:   { color: '#6366f1', fontSize: 12, fontFamily: 'monospace' },
  cancelButton:       { backgroundColor: '#7f1d1d', borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', marginTop: 8 },
  cancelButtonText:   { color: '#fca5a5', fontWeight: '700' },
  driverMarker:       { backgroundColor: '#6366f1', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: '#fff' },
  driverMarkerText:   { fontSize: 18 },
  historyButton:      { backgroundColor: '#334155', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  historyButtonText:  { color: '#fff', fontWeight: '600', fontSize: 15 },
});