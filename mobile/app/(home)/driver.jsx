import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function DriverScreen() {
  const { user, logout } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    fetchTrips();
    // Polling cada 10 segundos para ver viajes nuevos
    const interval = setInterval(fetchTrips, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await api.get('/trips/available');
      setTrips(res.data.data?.trips || res.data.trips || []);
    } catch (err) {
      console.log('Error fetching trips:', err.response?.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (tripId) => {
    try {
      setAccepting(tripId);
      await api.patch(`/trips/${tripId}/status`, { status: 'accepted' });
      Alert.alert('¡Viaje aceptado!', 'Dirigite al punto de origen.');
      fetchTrips();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al aceptar el viaje';
      Alert.alert('Error', msg);
    } finally {
      setAccepting(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const renderTrip = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>🚕 Viaje disponible</Text>
        <Text style={styles.cardTime}>
          {new Date(item.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: '#4ade80' }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.originAddress || 'Origen'}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.dot, { backgroundColor: '#e94560' }]} />
          <Text style={styles.routeText} numberOfLines={1}>
            {item.destinationAddress || 'Destino'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.acceptButton, accepting === item.id && styles.buttonDisabled]}
        onPress={() => handleAccept(item.id)}
        disabled={accepting === item.id}
      >
        {accepting === item.id
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.acceptText}>Aceptar viaje</Text>
        }
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.role}>Modo conductor</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Viajes disponibles */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Buscando viajes...</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e94560"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🕐</Text>
              <Text style={styles.emptyText}>No hay viajes disponibles</Text>
              <Text style={styles.emptySubtext}>Bajá para actualizar</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 56,
    backgroundColor: '#16213e',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: { color: '#fff', fontSize: 18, fontWeight: '700' },
  role: { color: '#e94560', fontSize: 12, fontWeight: '600', marginTop: 2 },
  logoutText: { color: '#e94560', fontSize: 14, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cardTime: { color: '#888', fontSize: 12 },
  route: { marginBottom: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeText: { color: '#ddd', fontSize: 14, flex: 1 },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#333',
    marginLeft: 4,
    marginVertical: 4,
  },
  acceptButton: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#888', fontSize: 13 },
});