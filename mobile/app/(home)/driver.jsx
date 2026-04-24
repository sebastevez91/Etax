import { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../../services/socket';

export default function DriverScreen() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [trips, setTrips]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTrip, setActiveTrip]     = useState(null);
  const locationIntervalRef             = useRef(null);

  // Conectar socket al montar
  useEffect(() => {
    const socket = connectSocket(token);

    return () => {
      stopEmittingLocation();
      disconnectSocket();
    };
  }, []);

  // Cargar viajes disponibles
  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trips/available', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const available = (res.data.data?.trips || []).filter(t => t.status === 'requested');
      setTrips(available);
    } catch (err) {
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

      // Unirse a la sala del viaje
      const socket = getSocket();
      socket.emit('join_trip_room', { tripId });
      socket.on('joined_trip_room', ({ tripId: id }) => {
        console.log('🚗 Driver unido a sala:', id);
        startEmittingLocation(id);
      });

      Alert.alert('¡Viaje aceptado!', 'Estás emitiendo tu ubicación en tiempo real.');
      fetchTrips();
    } catch (err) {
      Alert.alert('Error', 'No se pudo aceptar el viaje.');
    }
  };

  const startEmittingLocation = async (tripId) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación.');
      return;
    }

    // Emitir cada 3 segundos
    locationIntervalRef.current = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('driver:location', {
          tripId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
        console.log(`📍 Emitiendo ubicación — ${loc.coords.latitude}, ${loc.coords.longitude}`);
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
      <Text style={styles.cardTitle}>Viaje #{item.id.slice(0, 8)}</Text>
      <Text style={styles.cardText}>📍 Origen: {item.originAddress || `${item.originLat}, ${item.originLng}`}</Text>
      <Text style={styles.cardText}>🏁 Destino: {item.destinationAddress || `${item.destinationLat}, ${item.destinationLng}`}</Text>
      <Text style={styles.cardText}>💰 Precio estimado: ${item.estimatedPrice}</Text>
      <TouchableOpacity style={styles.button} onPress={() => acceptTrip(item.id)}>
        <Text style={styles.buttonText}>Aceptar viaje</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel del Conductor</Text>
        <TouchableOpacity onPress={async () => { 
            stopEmittingLocation(); 
            await logout();
            router.replace('/(auth)/login');
          }}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      {activeTrip && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>
            🟢 Viaje activo — emitiendo ubicación cada 3 seg
          </Text>
        </View>
      )}

      {loading
        ? <ActivityIndicator color="#6366f1" size="large" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={trips}
            keyExtractor={item => item.id}
            renderItem={renderTrip}
            ListEmptyComponent={
              <Text style={styles.empty}>No hay viajes disponibles</Text>
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
  container:        { flex: 1, backgroundColor: '#0f172a' },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, backgroundColor: '#1e293b' },
  title:            { fontSize: 20, fontWeight: '800', color: '#fff' },
  logout:           { color: '#f87171', fontWeight: '600' },
  activeBanner:     { backgroundColor: '#166534', padding: 12, alignItems: 'center' },
  activeBannerText: { color: '#86efac', fontWeight: '600', fontSize: 13 },
  card:             { backgroundColor: '#1e293b', margin: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  cardTitle:        { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 8 },
  cardText:         { color: '#94a3b8', fontSize: 14, marginBottom: 4 },
  button:           { backgroundColor: '#6366f1', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  buttonText:       { color: '#fff', fontWeight: '700' },
  empty:            { color: '#475569', textAlign: 'center', marginTop: 60, fontSize: 16 },
});