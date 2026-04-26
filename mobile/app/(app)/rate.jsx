import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../services/api';

export default function RateScreen() {
  const { tripId, ratedRole } = useLocalSearchParams();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    console.log('🔍 ratedRole:', ratedRole);
    if (rating === 0) {
      Alert.alert('Seleccioná una calificación');
      return;
    }
    try {
      setLoading(true);
      console.log('🔍 tripId:', tripId);  // ✅ NUEVO
      console.log('🔍 rating:', rating);  // ✅ NUEVO
      await api.post(`/trips/${tripId}/rating`, { rating, comment });
      Alert.alert('¡Gracias por tu calificación!', '', [
        { text: 'OK', onPress: () => router.replace(
            ratedRole === 'passenger' 
              ? '/(home)/driver' 
              : '/(home)/dashboard'
          ) 
        }
      ]);
    } catch (e) {
        console.log('🔍 error completo:', e.response?.data);  // ✅ NUEVO
      Alert.alert('Error', e.response?.data?.message || 'No se pudo enviar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Calificá a tu {ratedRole === 'driver' ? 'conductor' : 'pasajero'}
      </Text>

      {/* Estrellas */}
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, n <= rating && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Comentario opcional..."
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Enviar calificación</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  stars: { flexDirection: 'row', marginBottom: 24 },
  star: { fontSize: 48, color: '#ccc', marginHorizontal: 6 },
  starActive: { color: '#F59E0B' },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, padding: 12, marginBottom: 24,
    minHeight: 80, textAlignVertical: 'top'
  },
  btn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 8, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});