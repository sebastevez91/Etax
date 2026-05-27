import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Image
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../../services/socket';

export default function DriverScreen() {
  const { token, logout, user } = useAuth();
  const router = useRouter();
  const [trips, setTrips]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripStatus, setTripStatus] = useState(null);
  const locationIntervalRef         = useRef(null);

  useEffect(() => {
    const socket = connectSocket(token);
    socket.on('trip:updated', (updatedTrip) => {
      if (updatedTrip.status === 'completed') {
        stopEmittingLocation();
        router.replace(`/(app)/rate?tripId=${updatedTrip.tripId}&ratedRole=passenger`);
      }
    });
    return () => { stopEmittingLocation(); disconnectSocket(); };
  }, []);

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trips/available', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const available = (res.data.data?.trips || []).filter(t => t.status === 'requested');
      setTrips(available);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los viajes.');
    } finally {
      setLoading(false);
    }
  };

  const acceptTrip = async (tripId) => {
    try {
      await api.patch(`/trips/${tripId}/status`,
        { status: 'accepted' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveTrip(tripId);
      setTripStatus('accepted');
      const socket = getSocket();
      socket.emit('join_trip_room', { tripId });
      socket.on('joined_trip_room', ({ tripId: id }) => {
        startEmittingLocation(id);
      });
      Alert.alert('¡Viaje aceptado!', 'Estás emitiendo tu ubicación en tiempo real.');
      fetchTrips();
    } catch {
      Alert.alert('Error', 'No se pudo aceptar el viaje.');
    }
  };

  const startTrip = async () => {
    try {
      await api.patch(`/trips/${activeTrip}/status`,
        { status: 'in_progress' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTripStatus('in_progress');
      Alert.alert('¡Viaje iniciado!');
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el viaje.');
    }
  };

  const completeTrip = async () => {
    try {
      await api.patch(`/trips/${activeTrip}/status`,
        { status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTripStatus('completed');
    } catch {
      Alert.alert('Error', 'No se pudo completar el viaje.');
    }
  };

  const startEmittingLocation = async (tripId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    locationIntervalRef.current = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('driver:location', {
          tripId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      }
    }, 3000);
  };

  const stopEmittingLocation = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const renderTrip = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Viaje #{item.id.slice(0, 8)}</Text>
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>${item.estimatedPrice}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardRow}>
        <Text style={styles.cardIcon}>📍</Text>
        <View style={styles.cardTextWrapper}>
          <Text style={styles.cardLabel}>Origen</Text>
          <Text style={styles.cardValue} numberOfLines={1}>
            {item.originAddress || `${item.originLat?.toFixed(4)}, ${item.originLng?.toFixed(4)}`}
          </Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.cardIcon}>🏁</Text>
        <View style={styles.cardTextWrapper}>
          <Text style={styles.cardLabel}>Destino</Text>
          <Text style={styles.cardValue} numberOfLines={1}>
            {item.destAddress || `${item.destLat?.toFixed(4)}, ${item.destLng?.toFixed(4)}`}
          </Text>
        </View>
      </View>

      {item.passenger && (
        <View style={styles.cardRow}>
          <Text style={styles.cardIcon}>👤</Text>
          <View style={styles.cardTextWrapper}>
            <Text style={styles.cardLabel}>Pasajero</Text>
            <Text style={styles.cardValue}>
              {item.passenger.name} — ⭐ {item.passenger.rating}
            </Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.acceptButton} onPress={() => acceptTrip(item.id)}>
        <Text style={styles.acceptButtonText}>Aceptar viaje</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
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
              <Text style={styles.headerSubtitle}>Conductor: {user.name.split(' ')[0]}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => { stopEmittingLocation(); await logout(); router.replace('/(auth)/login'); }}
        >
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Banner viaje activo */}
      {activeTrip && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            🟢 Viaje activo — emitiendo ubicación
          </Text>
          <View style={styles.actionRow}>
            {tripStatus === 'accepted' && (
              <TouchableOpacity style={styles.actionButton} onPress={startTrip}>
                <Text style={styles.actionButtonText}>▶️ Iniciar viaje</Text>
              </TouchableOpacity>
            )}
            {tripStatus === 'in_progress' && (
              <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={completeTrip}>
                <Text style={styles.actionButtonText}>✅ Finalizar viaje</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Lista de viajes */}
      {loading
        ? <ActivityIndicator color="#75aadb" size="large" style={{ marginTop: 60 }} />
        : (
          <FlatList
            data={trips}
            keyExtractor={item => item.id}
            renderItem={renderTrip}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={styles.listHeader}>
                {trips.length > 0 ? `${trips.length} viaje(s) disponible(s)` : ''}
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🚕</Text>
                <Text style={styles.empty}>No hay viajes disponibles</Text>
                <Text style={styles.emptyHint}>Deslizá para actualizar</Text>
              </View>
            }
            refreshing={loading}
            onRefresh={fetchTrips}
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0a1628' },

  // Header
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 14, backgroundColor: '#0d2045', borderBottomWidth: 2, borderBottomColor: '#75aadb' },
  headerLeft:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo:         { width: 36, height: 36, borderRadius: 8 },
  title:              { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  headerSubtitle:     { fontSize: 12, color: '#75aadb', marginTop: 1 },
  logoutBtn:          { backgroundColor: '#0a1e3d', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1a3a6e' },
  logout:             { color: '#75aadb', fontWeight: '600', fontSize: 13 },

  // Banner
  activeBanner:       { backgroundColor: '#0a2e1a', padding: 14, borderBottomWidth: 1, borderBottomColor: '#166534' },
  activeBannerText:   { color: '#86efac', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  actionRow:          { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  actionButton:       { backgroundColor: '#166534', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: '#86efac' },
  completeButton:     { backgroundColor: '#1a3a6e', borderColor: '#75aadb' },
  actionButtonText:   { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Lista
  listContent:        { padding: 12, paddingBottom: 32 },
  listHeader:         { color: '#75aadb', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },

  // Cards
  card:               { backgroundColor: '#0d2045', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1a3a6e' },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle:          { color: '#fff', fontWeight: '700', fontSize: 15 },
  priceBadge:         { backgroundColor: '#0a1e3d', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#f6c500' },
  priceText:          { color: '#f6c500', fontWeight: '800', fontSize: 14 },
  cardDivider:        { height: 1, backgroundColor: '#1a3a6e', marginBottom: 12 },
  cardRow:            { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  cardIcon:           { fontSize: 16, marginTop: 2 },
  cardTextWrapper:    { flex: 1 },
  cardLabel:          { color: '#75aadb', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue:          { color: '#fff', fontSize: 14, marginTop: 2 },
  acceptButton:       { backgroundColor: '#75aadb', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 4 },
  acceptButtonText:   { color: '#0a1628', fontWeight: '800', fontSize: 15 },

  // Empty
  emptyContainer:     { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyIcon:          { fontSize: 48 },
  empty:              { color: '#475569', fontSize: 16, fontWeight: '600' },
  emptyHint:          { color: '#334155', fontSize: 13 },
});