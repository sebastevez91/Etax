import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, StyleSheet, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';

const STATUS_FILTERS = [
  { label: 'Todos',      value: ''          },
  { label: 'Completados', value: 'completed' },
  { label: 'Cancelados', value: 'cancelled' },
];

const STATUS_LABELS = {
  completed:   { text: 'Completado', color: '#22c55e' },
  cancelled:   { text: 'Cancelado',  color: '#ef4444' },
  in_progress: { text: 'En curso',   color: '#3b82f6' },
  accepted:    { text: 'Aceptado',   color: '#f59e0b' },
  requested:   { text: 'Solicitado', color: '#8b5cf6' },
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const TripCard = ({ trip }) => {
  const status = STATUS_LABELS[trip.status] || { text: trip.status, color: '#6b7280' };
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.tripId}>Viaje #{trip.id.slice(0, 8)}</Text>
        <View style={[styles.badge, { backgroundColor: status.color + '22' }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

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
  const [trips, setTrips]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState(null);
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis viajes</Text>
      </View>

      {/* Filtros */}
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

      {/* Lista */}
      <FlatList
        data={trips}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay viajes para mostrar</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator size="small" color="#6366f1" style={{ marginVertical: 16 }} />
            : pagination && page < pagination.totalPages
              ? <Text style={styles.loadMoreHint}>Deslizá para cargar más</Text>
              : null
        }
        contentContainerStyle={trips.length === 0 && styles.emptyContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f8fafc' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer:  { flex: 1 },
  header:          { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 52, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn:         { marginRight: 12 },
  backText:        { color: '#6366f1', fontSize: 16 },
  title:           { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  filters:         { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filterBtn:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  filterActive:    { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  filterText:      { fontSize: 13, color: '#64748b', fontWeight: '500' },
  filterTextActive:{ color: '#fff' },
  card:            { margin: 12, marginBottom: 0, padding: 16, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tripId:          { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  badge:           { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText:       { fontSize: 12, fontWeight: '600' },
  row:             { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label:           { fontSize: 13, color: '#64748b' },
  value:           { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  emptyText:       { fontSize: 15, color: '#94a3b8', marginTop: 40 },
  loadMoreHint:    { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginVertical: 12 },
});