import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Completá email y contraseña');
      return;
    }
    try {
      setLoading(true);
      const user = await login(email.trim().toLowerCase(), password);
      // Redirigir según rol
      if (user.role === 'driver') {
        router.replace('/(home)/driver');
      } else {
        router.replace('/(home)/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión';
      console.log(err);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>ETax</Text>
        <Text style={styles.subtitle}>Iniciá sesión para continuar</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Ingresar</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace('/(auth)/register')}>
          <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 16 }}>
            ¿No tenés cuenta?{' '}
            <Text style={{ color: '#6366f1', fontWeight: '700' }}>Registrate</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 28,
  },
  input: {
    backgroundColor: '#0f3460',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});