import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Keyboard, ScrollView, Image
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../../services/socket';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { fetchRoute } from '../../services/mapbox';

export default function DashboardScreen() {
  const { token, logout, user } = useAuth();
  const router = useRouter();
  const mapRef = useRef(null);
  const activeTripRef = useRef(null);

  const [location, setLocation]             = useState(null);
  const [destination, setDestination]       = useState('');
  const [destCoords, setDestCoords]         = useState(null);
  const [selectedPlace, setSelectedPlace]   = useState(null);
  const [loading, setLoading]               = useState(false);
  const [activeTrip, setActiveTrip]         = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [keyboardOpen, setKeyboardOpen]     = useState(false);
  const [routeCoords, setRouteCoords]       = useState([]);

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
    socket.on('driver:location', ({ lat, lng }) => {
      console.log('📍 driver:location recibido:', lat, lng);
      setDriverLocation({ latitude: lat, longitude: lng });
    });
    return () => {
      socket.off('driver:location');
      socket.off('trip:updated');
    };
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
      setRouteCoords([]); // ← agregar esto
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
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/sol-ETax.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.title}>ETax</Text>
            {user?.name && (
              <Text style={styles.headerSubtitle}>Hola, {user.name.split(' ')[0]} 👋</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => { await logout(); router.replace('/(auth)/login'); }}
        >
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Mapa */}
      {location ? (
        <MapView
          ref={mapRef}
          style={keyboardOpen ? styles.mapSmall : styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={location}
          showsUserLocation
        >
          {destCoords && <Marker coordinate={destCoords} title="Destino" pinColor="#f6c500" />}
          {driverLocation?.latitude != null && driverLocation?.longitude != null && (
            <Marker coordinate={driverLocation} title="Tu conductor">
              <View style={styles.driverMarker}>
                <Text style={styles.driverMarkerText}>🚗</Text>
              </View>
            </Marker>
          )}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#75aadb"
              strokeWidth={4}
              geodesic
            />
          )}
        </MapView>
      ) : (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator color="#75aadb" size="large" />
          <Text style={styles.mapPlaceholderText}>Obteniendo ubicación...</Text>
        </View>
      )}

      {/* Panel inferior */}
      <ScrollView
        style={styles.panel}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.panelContent}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push('/(app)/history')}
        >
          <Text style={styles.historyButtonText}>📋 Mis viajes</Text>
        </TouchableOpacity>

        {!activeTrip ? (
          <>
            <Text style={styles.panelLabel}>¿A dónde vas hoy?</Text>
            <AddressAutocomplete
              placeholder="Ingresá tu destino..."
              onSelect={async (place) => {
                if (!location) {
                  Alert.alert('Error', 'Esperando tu ubicación para trazar la ruta...');
                  return;
                }

                setSelectedPlace(place);
                setDestination(place.name);
                setDestCoords({ latitude: place.lat, longitude: place.lng });

                const coords = await fetchRoute(
                  location.latitude,
                  location.longitude,
                  place.lat,
                  place.lng
                );
                setRouteCoords(coords);

                const fitPoints = [
                  { latitude: location.latitude, longitude: location.longitude },
                  { latitude: place.lat, longitude: place.lng },
                  ...coords,
                ];

                if (coords.length > 0) {
                  mapRef.current?.fitToCoordinates(fitPoints, {
                    edgePadding: { top: 80, right: 48, bottom: 280, left: 48 },
                    animated: true,
                  });
                } else {
                  mapRef.current?.animateToRegion({
                    latitude: place.lat,
                    longitude: place.lng,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }, 800);
                  Alert.alert(
                    'Ruta no disponible',
                    'No pudimos trazar el camino. Verificá el token de Mapbox o probá otro destino.'
                  );
                }
              }}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={requestTrip}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#0a1628" />
                : <Text style={styles.buttonText}>🚕 Solicitar viaje</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.tripStatus}>
            <View style={styles.tripStatusHeader}>
              <Text style={styles.tripStatusIcon}>
                {driverLocation ? '🚗' : '⏳'}
              </Text>
              <Text style={styles.tripStatusTitle}>
                {driverLocation ? 'Conductor en camino' : 'Buscando conductor...'}
              </Text>
            </View>

            <View style={styles.tripInfoBox}>
              <Text style={styles.tripInfoLabel}>Destino</Text>
              <Text style={styles.tripInfoValue} numberOfLines={2}>
                {activeTrip.destAddress}
              </Text>
              <Text style={[styles.tripInfoLabel, { marginTop: 8 }]}>Precio estimado</Text>
              <Text style={styles.tripInfoPrice}>
                ${activeTrip.estimatedPrice}
              </Text>
            </View>

            {driverLocation && (
              <View style={styles.coordsBox}>
                <Text style={styles.tripStatusCoords}>
                  📍 {driverLocation.latitude.toFixed(5)}, {driverLocation.longitude.toFixed(5)}
                </Text>
              </View>
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
  container:          { flex: 1, backgroundColor: '#0d2045' },

  // Header
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14, backgroundColor: '#0d2045', borderBottomWidth: 2, borderBottomColor: '#75aadb' },
  headerLeft:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo:         { width: 36, height: 36, borderRadius: 8 },
  title:              { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  headerSubtitle:     { fontSize: 12, color: '#75aadb', marginTop: 1 },
  logoutBtn:          { backgroundColor: '#0a1e3d', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1a3a6e' },
  logout:             { color: '#75aadb', fontWeight: '600', fontSize: 13 },

  // Mapa
  map:                { flex: 1 },
  mapSmall:           { height: 160 },
  mapPlaceholder:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPlaceholderText: { color: '#64748b', fontSize: 14 },

  // Panel
  panel:              { backgroundColor: '#0d2045', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderTopWidth: 2, borderColor: '#75aadb', maxHeight: '58%' },
  panelContent:       { padding: 20, paddingBottom: 36 },
  handleBar:          { width: 40, height: 4, backgroundColor: '#75aadb', borderRadius: 2, alignSelf: 'center', marginBottom: 16, opacity: 0.5 },
  panelLabel:         { color: '#75aadb', fontSize: 13, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },

  // Botones
  historyButton:      { backgroundColor: '#0a1e3d', borderRadius: 12, padding: 13, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: '#1a3a6e' },
  historyButtonText:  { color: '#75aadb', fontWeight: '600', fontSize: 14 },
  button:             { backgroundColor: '#75aadb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonDisabled:     { opacity: 0.6 },
  buttonText:         { color: '#0a1628', fontWeight: '800', fontSize: 16 },

  // Trip status
  tripStatus:         { gap: 12 },
  tripStatusHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tripStatusIcon:     { fontSize: 28 },
  tripStatusTitle:    { color: '#fff', fontWeight: '800', fontSize: 17, flex: 1 },
  tripInfoBox:        { backgroundColor: '#0a1e3d', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1a3a6e' },
  tripInfoLabel:      { color: '#75aadb', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  tripInfoValue:      { color: '#fff', fontSize: 14, fontWeight: '500', marginTop: 4 },
  tripInfoPrice:      { color: '#f6c500', fontSize: 22, fontWeight: '900', marginTop: 4 },
  coordsBox:          { backgroundColor: '#0a1e3d', borderRadius: 8, padding: 10 },
  tripStatusCoords:   { color: '#75aadb', fontSize: 12, fontFamily: 'monospace', textAlign: 'center' },
  cancelButton:       { backgroundColor: '#1a0a0a', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#7f1d1d' },
  cancelButtonText:   { color: '#fca5a5', fontWeight: '700', fontSize: 15 },

  // Driver marker
  driverMarker:       { backgroundColor: '#75aadb', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: '#fff' },
  driverMarkerText:   { fontSize: 18 },
});