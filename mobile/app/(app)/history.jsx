import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';

const STATUS_FILTERS = [
  { label: 'Todos',       value: ''          },
  { label: 'Completados', value: 'completed' },
  { label: 'Cancelados',  value: 'cancelled' },
];

const STATUS_LABELS = {
  completed:   { text: 'Completado', color: '#22c55e' },
  cancelled:   { text: 'Cancelado',  color: '#ef4444' },
  in_progress: { text: 'En curso',   color: '#75aadb' },
  accepted:    { text: 'Aceptado',   color: '#f6c500' },
  requested:   { text: 'Solicitado', color: '#7a9cbf' },
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const TripCard = ({ trip }) => {
  const status = STATUS_LABELS[trip.status] || { text: trip.status, color: '#7a9cbf' };
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.tripId}>Viaje #{trip.id.slice(0, 8)}</Text>
        <View style={[styles.badge, { backgroundColor: status.color + '22' }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.label}>Precio:</Text>
        <Text style={styles.value}>${Number(trip.finalPrice || trip.estimatedPrice).toFixed(2)}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Fecha:</Text>
        <Text style={styles.value}>{formatDate(trip.createdAt)}</Text>
      </View>

      {trip.completedAt && (
        <View style={styles.row}>
          <Text style={styles.label}>Completado:</Text>
          <Text style={styles.value}>{formatDate(trip.completedAt)}</Text>
        </View>
      )}
    </View>
  );
};

export default function HistoryScreen() {
  const router = useRouter();
  const [trips, setTrips]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [filter, setFilter]           = useState('');
  const [page, setPage]               = useState(1);
  const [pagination, setPagination]   = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchHistory = useCallback(async (selectedFilter, selectedPage, append = false) => {
    try {
      const params = { page: selectedPage, limit: 10 };
      if (selectedFilter) params.status = selectedFilter;

      const res = await api.get('/trips/history', { params });
      const { trips: newTrips, pagination: pag } = res.data;

      setTrips(prev => append ? [...prev, ...newTrips] : newTrips);
      setPagination(pag);
    } catch (err) {
      console.error('Error historial:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchHistory(filter, 1, false);
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchHistory(filter, 1, false);
  };

  const loadMore = () => {
    if (loadingMore || !pagination) return;
    if (page >= pagination.totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    fetchHistory(filter, nextPage, true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.topStripe} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#75aadb" />
        </View>
        <View style={styles.bottomStripe} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topStripe} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis viajes</Text>
        <Text style={styles.subtitle}>Tu historial en ETax</Text>
        <View style={styles.headerDivider} />
      </View>

      <View style={styles.filters}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterBtn, filter === f.value && styles.filterActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={trips}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#75aadb"
            colors={['#75aadb']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay viajes para mostrar</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator size="small" color="#75aadb" style={{ marginVertical: 16 }} />
            : pagination && page < pagination.totalPages
              ? <Text style={styles.loadMoreHint}>Deslizá para cargar más</Text>
              : null
        }
        contentContainerStyle={[
          styles.listContent,
          trips.length === 0 && styles.emptyContainer,
        ]}
      />

      <View style={styles.bottomStripe} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#75aadb',
    zIndex: 10,
  },
  bottomStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#f6c500',
    zIndex: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flexGrow: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    color: '#f6c500',
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#75aadb',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  headerDivider: {
    height: 2,
    backgroundColor: '#75aadb',
    opacity: 0.4,
    borderRadius: 2,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0a1e3d',
    borderWidth: 1,
    borderColor: '#1a3a6e',
  },
  filterActive: {
    backgroundColor: '#75aadb',
    borderColor: '#75aadb',
  },
  filterText: {
    fontSize: 13,
    color: '#7a9cbf',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0a1628',
    fontWeight: '800',
  },
  card: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#0d2045',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a3a6e',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 2,
    backgroundColor: '#75aadb',
    marginVertical: 10,
    opacity: 0.4,
    borderRadius: 2,
  },
  tripId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 13,
    color: '#7a9cbf',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 15,
    color: '#7a9cbf',
    marginTop: 40,
    textAlign: 'center',
  },
  loadMoreHint: {
    textAlign: 'center',
    color: '#7a9cbf',
    fontSize: 12,
    marginVertical: 12,
  },
});
