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
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

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
        <Text style={styles.doneTitle}>Revisa tu correo</Text>
        <Text style={styles.doneText}>
          Enviamos un enlace de activación a{'\n'}
          <Text style={styles.doneEmail}>{email}</Text>.{'\n'}
          Tu cuenta queda pendiente hasta que lo confirmes.
        </Text>
        <Pressable style={styles.button} onPress={() => navigation.replace('Login')}>
          <Text style={styles.buttonText}>Ir a iniciar sesión</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Volver</Text>
        </Pressable>

        <Text style={styles.title}>Crear cuenta</Text>

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput style={styles.input} placeholder="Tu nombre" value={nombre} onChangeText={setNombre} />

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="tú@correo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />

        <Text style={styles.label}>Confirmar contraseña</Text>
        <TextInput style={styles.input} secureTextEntry value={confirm} onChangeText={setConfirm} />

        <Text style={styles.label}>Territorio (parroquia) — Cuenca, Azuay</Text>
        <Pressable style={styles.selectInput} onPress={() => setPickerVisible(true)}>
          <Text style={parroquia ? styles.selectText : styles.selectPlaceholder}>
            {parroquia || 'Selecciona tu parroquia'}
          </Text>
        </Pressable>

        <View style={styles.checkboxRow}>
          <Pressable onPress={() => setAcepta(!acepta)} style={[styles.checkbox, acepta && styles.checkboxChecked]}>
            {acepta && <Text style={styles.checkboxMark}>✓</Text>}
          </Pressable>
          <Text style={styles.checkboxLabel}>
            He leído y acepto la{' '}
            <Text style={styles.checkboxLink} onPress={() => navigation.navigate('PrivacyPolicy')}>
              política de privacidad
            </Text>{' '}
            y el tratamiento de mis datos conforme a la LOPDP.
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, styles.buttonAccent, (!canSubmit || loading) && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={!canSubmit || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
        </Pressable>
      </ScrollView>

      <Modal visible={pickerVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Selecciona tu parroquia</Text>
            <FlatList
              data={PARROQUIA_LIST}
              keyExtractor={(item, index) => item.label + index}
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

const TEAL = '#0f766e';
const AMBER = '#d97706';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },
  backButton: { marginBottom: 12 },
  backText: { color: TEAL, fontSize: 14, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', color: '#4b5563', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    color: '#111827',
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  selectText: { fontSize: 15, color: '#111827' },
  selectPlaceholder: { fontSize: 15, color: '#9ca3af' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: TEAL, borderColor: TEAL },
  checkboxMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 12.5, color: '#6b7280', lineHeight: 18 },
  checkboxLink: { color: '#0f766e', fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 10 },
  button: {
    backgroundColor: TEAL,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonAccent: { backgroundColor: AMBER },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 32, maxHeight: '60%' },
  modalTitle: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'center', marginBottom: 8 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 24, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  modalSectionHeader: { paddingTop: 16, paddingBottom: 6, paddingHorizontal: 24, fontSize: 12, fontWeight: '700', color: '#0f766e', textTransform: 'uppercase' },
  modalItemText: { fontSize: 15, color: '#111827' },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, backgroundColor: '#fff' },
  doneTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },
  doneText: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  doneEmail: { fontWeight: '600', color: '#374151' },
});
