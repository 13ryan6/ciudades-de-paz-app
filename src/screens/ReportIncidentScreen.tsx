
import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<any>;

const TEAL = '#0f766e';
const AMBER = '#d97706';

type Categoria = { titulo: string; tipos: string[] };

const CATEGORIAS: Categoria[] = [
  { titulo: 'Seguridad y convivencia', tipos: ['Acoso en espacio público', 'Inseguridad / robo', 'Conflicto o violencia en el barrio'] },
  { titulo: 'Servicios básicos', tipos: ['Falta de acceso a agua / cortes de agua', 'Recolección de basura deficiente', 'Acumulación de basura en espacios públicos'] },
  { titulo: 'Ambiental', tipos: ['Incendios forestales o quemas no controladas', 'Contaminación ambiental (aire, agua, ruido)'] },
  { titulo: 'Infraestructura y espacio público', tipos: ['Iluminación deficiente', 'Espacio público deteriorado o abandonado'] },
  { titulo: 'Otro', tipos: ['Otro'] },
];

export default function ReportIncidentScreen({ navigation }: Props) {
  const [checking, setChecking] = useState(true);
  const [tieneFoto, setTieneFoto] = useState(true);
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoAdjunta, setFotoAdjunta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setChecking(false);
        return;
      }
      const { data } = await supabase.from('profiles').select('foto_url').eq('id', user.id).single();
      setTieneFoto(!!data?.foto_url);
      setChecking(false);
    })();
  }, []);

  const canSubmit = tipo && descripcion.trim().length > 5;

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError('Selecciona un tipo y describe la incidencia.');
      return;
    }
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      setLoading(false);
      setError('Sesión no válida, vuelve a iniciar sesión.');
      return;
    }

    const { error: insertError } = await supabase.from('incidencias').insert({
      usuario_id: user.id,
      tipo,
      descripcion: descripcion.trim(),
      territorio: 'Cuenca',
      estado: 'pendiente',
      latitud: -2.9006,
      longitud: -79.0045,
    });

    setLoading(false);
    if (insertError) {
      setError('No se pudo enviar el reporte. Intenta de nuevo.');
      return;
    }
    navigation.goBack();
  };

  if (checking) {
    return (
      <View style={styles.flex}>
        <ActivityIndicator color={TEAL} size="large" style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!tieneFoto) {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedTitle}>Falta tu foto de perfil</Text>
        <Text style={styles.blockedText}>
          Para reportar incidencias primero debes subir una foto de perfil — es una medida para evitar reportes falsos.
        </Text>
        <Pressable
          style={styles.submitButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Perfil' } as never)}
        >
          <Text style={styles.submitText}>Ir a mi perfil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Reportar incidencia</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tipo de incidencia</Text>
        {CATEGORIAS.map((cat) => (
          <View key={cat.titulo} style={styles.categoryBlock}>
            <Text style={styles.categoryTitle}>{cat.titulo}</Text>
            <View style={styles.chipsWrap}>
              {cat.tipos.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, tipo === t && styles.chipActive]}
                  onPress={() => setTipo(t)}
                >
                  <Text style={[styles.chipText, tipo === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Cuéntanos qué ocurrió, cuándo y en qué contexto..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          value={descripcion}
          onChangeText={setDescripcion}
        />

        <Pressable
          style={[styles.photoButton, fotoAdjunta && styles.photoButtonActive]}
          onPress={() => setFotoAdjunta(!fotoAdjunta)}
        >
          <Text style={[styles.photoButtonText, fotoAdjunta && styles.photoButtonTextActive]}>
            {fotoAdjunta ? '✓ Foto adjuntada' : 'Adjuntar foto'}
          </Text>
        </Pressable>

        <View style={styles.locationBox}>
          <Text style={styles.locationText}>
            📍 Ubicación auto-detectada: <Text style={styles.locationBold}>Cuenca, Ecuador</Text>
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          disabled={!canSubmit || loading}
          onPress={handleSubmit}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Enviar reporte</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backButton: { marginBottom: 10 },
  backText: { color: TEAL, fontSize: 14, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 10, marginTop: 4 },
  categoryBlock: { marginBottom: 14 },
  categoryTitle: { fontSize: 11.5, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 8 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: TEAL, borderColor: TEAL },
  chipText: { fontSize: 12, color: '#4b5563' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  textarea: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14,
    fontSize: 14, color: '#111827', textAlignVertical: 'top', minHeight: 90, marginBottom: 14,
  },
  photoButton: {
    borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 14,
  },
  photoButtonActive: { borderColor: TEAL, borderStyle: 'solid', backgroundColor: '#f0fdfa' },
  photoButtonText: { fontSize: 13, color: '#6b7280' },
  photoButtonTextActive: { color: TEAL, fontWeight: '600' },
  locationBox: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, marginBottom: 18 },
  locationText: { fontSize: 12.5, color: '#4b5563' },
  locationBold: { fontWeight: '700', color: '#111827' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: AMBER, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  blockedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  blockedTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10, textAlign: 'center' },
  blockedText: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
});