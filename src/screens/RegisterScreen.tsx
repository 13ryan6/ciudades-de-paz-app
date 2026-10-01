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
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, shadowStrong } from '../constants/theme';

type Props = NativeStackScreenProps<any>;

const PARROQUIAS_URBANAS = [
  'Bellavista', 'Cañaribamba', 'El Sagrario', 'El Batán', 'El Vecino',
  'Gil Ramírez Dávalos', 'El Vergel', 'Hermano Miguel', 'Huayna Cápac',
  'Machángara', 'Monay', 'San Blas', 'San Sebastián', 'Sucre',
  'Totoracocha', 'Yanuncay',
];

const PARROQUIAS_RURALES = [
  'Baños', 'Chaucha', 'Checa', 'Chiquintad', 'Cumbe', 'El Valle', 'Llacao',
  'Molleturo', 'Nulti', 'Octavio Cordero Palacios', 'Paccha', 'Quingeo',
  'Ricaurte', 'San Joaquín', 'Santa Ana', 'Sayausí', 'Sidcay', 'Sinincay',
  'Tarqui', 'Turi', 'Victoria del Portete',
];

type ParroquiaItem = { type: 'header' | 'item'; label: string };

const PARROQUIA_LIST: ParroquiaItem[] = [
  { type: 'header', label: 'Parroquias urbanas' },
  ...PARROQUIAS_URBANAS.map((label) => ({ type: 'item' as const, label })),
  { type: 'header', label: 'Parroquias rurales' },
  ...PARROQUIAS_RURALES.map((label) => ({ type: 'item' as const, label })),
];

export default function RegisterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [parroquia, setParroquia] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    nombre.trim() && email.trim() && password.length >= 6 && password === confirm && parroquia && acepta;

  const handleRegister = async () => {
    setError(null);
    if (!canSubmit) {
      if (password !== confirm) setError('Las contraseñas no coinciden.');
      else if (password.length < 6) setError('La contraseña debe tener al menos 6 caracteres.');
      else setError('Completa todos los campos y acepta la política de privacidad.');
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre_completo: nombre.trim(),
          parroquia,
        },
      },
    });
    setLoading(false);

    if (authError) {
      setError(authError.message.includes('already registered')
        ? 'Ese correo ya tiene una cuenta.'
        : 'No se pudo crear la cuenta. Intenta de nuevo.');
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.doneIconWrap}>
          <Ionicons name="mail-unread" size={34} color={colors.primary} />
        </View>
        <Text style={styles.doneTitle}>Revisa tu correo</Text>
        <Text style={styles.doneText}>
          Enviamos un enlace de activación a{'\n'}
          <Text style={styles.doneEmail}>{email}</Text>.{'\n'}
          Tu cuenta queda pendiente hasta que lo confirmes.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.buttonText}>Ir a iniciar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            <Ionicons name="person-add" size={24} color={colors.primary} />
          </View>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Únete y participa en tu territorio.</Text>
        </View>

        <Text style={styles.label}>Nombre completo</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor={colors.textMuted} value={nombre} onChangeText={setNombre} />
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
          <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
        </View>

        <Text style={styles.label}>Confirmar contraseña</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Repite tu contraseña" placeholderTextColor={colors.textMuted} secureTextEntry value={confirm} onChangeText={setConfirm} />
        </View>

        <Text style={styles.label}>Territorio (parroquia) — Cuenca, Azuay</Text>
        <Pressable style={styles.selectWrap} onPress={() => setPickerVisible(true)}>
          <Ionicons name="location-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
          <Text style={parroquia ? styles.selectText : styles.selectPlaceholder}>
            {parroquia || 'Selecciona tu parroquia'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Pressable>

        <View style={styles.checkboxRow}>
          <Pressable onPress={() => setAcepta(!acepta)} style={[styles.checkbox, acepta && styles.checkboxChecked]} hitSlop={6}>
            {acepta && <Ionicons name="checkmark" size={13} color="#fff" />}
          </Pressable>
          <Text style={styles.checkboxLabel}>
            He leído y acepto la{' '}
            <Text style={styles.checkboxLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
              política de privacidad
            </Text>{' '}
            y el tratamiento de mis datos conforme a la LOPDP.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={15} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonAccent, (!canSubmit || loading) && styles.buttonDisabled, pressed && canSubmit && styles.buttonPressed]}
          onPress={handleRegister}
          disabled={!canSubmit || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
        </Pressable>
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Selecciona tu parroquia</Text>
            <FlatList
              data={PARROQUIA_LIST}
              keyExtractor={(item, index) => item.label + index}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) =>
                item.type === 'header' ? (
                  <Text style={styles.modalSectionHeader}>{item.label}</Text>
                ) : (
                  <Pressable
                    style={styles.modalItem}
                    onPress={() => {
                      setParroquia(item.label);
                      setPickerVisible(false);
                    }}
                  >
                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.modalItemText}>{item.label}</Text>
                  </Pressable>
                )
              }
            />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 36 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  headerBlock: { alignItems: 'center', marginTop: 20, marginBottom: 28 },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textSecondary, marginTop: 6 },

  label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 2 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 14,
    ...shadow,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 15, color: colors.text },

  selectWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 18,
    ...shadow,
  },
  selectText: { flex: 1, fontSize: 15, color: colors.text },
  selectPlaceholder: { flex: 1, fontSize: 15, color: colors.textMuted },

  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#d6d3d1',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { flex: 1, fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 },
  checkboxLink: { color: colors.primary, fontWeight: '700' },

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

  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowStrong,
  },
  buttonAccent: { backgroundColor: colors.accent },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(28,25,23,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 32,
    maxHeight: '62%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e7e5e4',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalSectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 24,
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  modalItemText: { fontSize: 15, color: colors.text },

  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: colors.background },
  doneIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  doneText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 30 },
  doneEmail: { fontWeight: '700', color: colors.text },
});