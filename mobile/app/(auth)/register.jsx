import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);

  const handleRegister = async () => {
    // Validaciones locales
    if (!name.trim() || !email.trim() || !password || !confirm) {
      return Alert.alert('Error', 'Completá todos los campos.');
    }
    if (password !== confirm) {
      return Alert.alert('Error', 'Las contraseñas no coinciden.');
    }
    if (password.length < 6) {
      return Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
    }

    try {
      setLoading(true);
      await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'passenger',
      });

      Alert.alert('¡Cuenta creada!', 'Ya podés iniciar sesión.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al registrarse.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>ETax — tu viaje, tu precio</Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre completo"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar contraseña"
          placeholderTextColor="#888"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Registrarse</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.link}>¿Ya tenés cuenta? <Text style={styles.linkBold}>Iniciá sesión</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 36,
  },
  input: {
    width: '100%',
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    width: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    color: '#94a3b8',
    fontSize: 14,
  },
  linkBold: {
    color: '#6366f1',
    fontWeight: '700',
  },
});