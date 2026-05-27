import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
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
      if (user.role === 'driver') {
        router.replace('/(home)/driver');
      } else {
        router.replace('/(home)/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al iniciar sesión';
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
      {/* Franja celeste superior decorativa */}
      <View style={styles.topStripe} />

      <View style={styles.card}>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/sol-ETax.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.appName}>ETax</Text>
        <Text style={styles.subtitle}>Tu viaje, tu precio</Text>

        {/* Divider celeste */}
        <View style={styles.divider} />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#7a9cbf"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#7a9cbf"
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
          <Text style={styles.registerText}>
            ¿No tenés cuenta?{' '}
            <Text style={styles.registerLink}>Registrate</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Franja dorada inferior decorativa */}
      <View style={styles.bottomStripe} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
    justifyContent: 'center',
    padding: 24,
  },
  topStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#75aadb', // celeste argentino
  },
  bottomStripe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#f6c500', // dorado
  },
  card: {
    backgroundColor: '#0d2045',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1a3a6e',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#75aadb',
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#75aadb',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 20,
  },
  divider: {
    height: 2,
    backgroundColor: '#75aadb',
    marginBottom: 24,
    opacity: 0.4,
    borderRadius: 2,
  },
  input: {
    backgroundColor: '#0a1e3d',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1a3a6e',
  },
  button: {
    backgroundColor: '#75aadb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0a1628',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  registerText: {
    color: '#7a9cbf',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  registerLink: {
    color: '#f6c500',
    fontWeight: '700',
  },
});