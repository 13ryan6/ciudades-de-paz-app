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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, shadowStrong, spacing } from '../constants/theme';

type Props = NativeStackScreenProps<any>;

export default function LoginScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
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

  // Envía el correo de recuperación al email escrito en el campo de arriba
  const handleForgotPassword = async () => {
    setError(null);
    setResetMsg(null);

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
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <View style={styles.headerBlock}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="person" size={26} color={colors.primary} />
          </View>
          <Text style={styles.title}>Bienvenido de nuevo</Text>
          <Text style={styles.subtitle}>Ingresa con tu cuenta de Ciudadanía ICIPAZ.</Text>
        </View>

        <Text style={styles.label}>Correo electrónico</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="tú@correo.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!verPassword}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setVerPassword(!verPassword)} hitSlop={8}>
            <Ionicons
              name={verPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={15} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {resetMsg && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={15} color={colors.success} />
            <Text style={styles.successText}>{resetMsg}</Text>
          </View>
        )}

        <Pressable
          style={styles.forgotLink}
          onPress={handleForgotPassword}
          disabled={loadingReset}
        >
          {loadingReset ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, (loading || pressed) && styles.buttonPressed]}
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  headerBlock: { alignItems: 'center', marginTop: 24, marginBottom: 32 },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },

  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 18,
    ...shadow,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.text,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 13, lineHeight: 18 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    padding: 12,
    marginBottom: 14,
  },
  successText: { flex: 1, color: colors.success, fontSize: 13, lineHeight: 18 },

  forgotLink: { alignSelf: 'flex-end', marginBottom: 26, minHeight: 20, justifyContent: 'center' },
  forgotText: { fontSize: 13.5, color: colors.primary, fontWeight: '700' },

  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowStrong,
  },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  
});