import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<any>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setResetMsg(null);
    if (!email || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (authError) {
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setError('Tu cuenta aún no está verificada. Revisa tu correo.');
      } else {
        setError('Correo o contraseña incorrectos.');
      }
      return;
    }

    navigation.replace('MainTabs');
  };

  // Envía el correo de recuperación al email escrito en el campo de arriba.
  // Supabase manda un enlace para restablecer la contraseña — la app no
  // maneja la contraseña nueva directamente, todo pasa por ese correo.
  const handleForgotPassword = async () => {
    setError(null);
    setResetMsg(null);

    // Sin el correo no sabemos a dónde enviar el enlace
    if (!email.trim()) {
      setError('Escribe tu correo arriba para enviarte el enlace de recuperación.');
      return;
    }

    setLoadingReset(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoadingReset(false);

    if (resetError) {
      setError('No se pudo enviar el correo de recuperación. Intenta de nuevo.');
      return;
    }
    setResetMsg('Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo (y la carpeta de spam).');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Volver</Text>
        </Pressable>

        <Text style={styles.title}>Iniciar sesión</Text>
        <Text style={styles.subtitle}>Ingresa con tu cuenta de Ciudadanía ICIPAZ.</Text>

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="tú@correo.com"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {resetMsg && <Text style={styles.success}>{resetMsg}</Text>}

        <Pressable
          style={styles.forgotLink}
          onPress={handleForgotPassword}
          disabled={loadingReset}
        >
          {loadingReset ? (
            <ActivityIndicator color={TEAL} size="small" />
          ) : (
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const TEAL = '#0f766e';
const AMBER = '#d97706';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 24 },
  backButton: { marginBottom: 12 },
  backText: { color: TEAL, fontSize: 14, fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '600', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '500', color: '#4b5563', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
    color: '#111827',
  },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  success: { color: '#065f46', fontSize: 13, marginBottom: 10 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 24, minHeight: 20, justifyContent: 'center' },
  forgotText: { fontSize: 13, color: TEAL, fontWeight: '500' },
  button: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerText: { fontSize: 13, color: '#6b7280' },
  registerLink: { fontSize: 13, color: AMBER, fontWeight: '600' },
});