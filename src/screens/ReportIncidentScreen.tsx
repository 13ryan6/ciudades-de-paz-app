import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, shadowStrong } from '../constants/theme';

type Props = NativeStackScreenProps<any>;

type Categoria = { titulo: string; icono: keyof typeof Ionicons.glyphMap; tipos: string[] };

const CATEGORIAS: Categoria[] = [
  { titulo: 'Seguridad y convivencia', icono: 'shield-checkmark-outline', tipos: ['Acoso en espacio público', 'Inseguridad / robo', 'Conflicto o violencia en el barrio'] },
  { titulo: 'Servicios básicos', icono: 'water-outline', tipos: ['Falta de acceso a agua / cortes de agua', 'Recolección de basura deficiente', 'Acumulación de basura en espacios públicos'] },
  { titulo: 'Ambiental', icono: 'leaf-outline', tipos: ['Incendios forestales o quemas no controladas', 'Contaminación ambiental (aire, agua, ruido)'] },
  { titulo: 'Infraestructura y espacio público', icono: 'business-outline', tipos: ['Iluminación deficiente', 'Espacio público deteriorado o abandonado'] },
  { titulo: 'Otro', icono: 'ellipsis-horizontal-outline', tipos: ['Otro'] },
];

export default function ReportIncidentScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);
  const [tieneFoto, setTieneFoto] = useState(true);
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoAsset, setFotoAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitud: number; longitud: number } | null>(null);
  const [ubicacionEstado, setUbicacionEstado] = useState<'buscando' | 'ok' | 'error'>('buscando');

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

  // Pide permiso de ubicación y guarda las coordenadas reales del dispositivo
  const obtenerUbicacion = async () => {
    setUbicacionEstado('buscando');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUbicacionEstado('error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitud: pos.coords.latitude, longitud: pos.coords.longitude });
      setUbicacionEstado('ok');
    } catch {
      setUbicacionEstado('error');
    }
  };

  useEffect(() => {
    obtenerUbicacion();
  }, []);

  const canSubmit = tipo && descripcion.trim().length > 5 && !!coords;

  const elegirDeGaleria = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Activa el acceso a tus fotos en los ajustes del teléfono.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      setFotoAsset(resultado.assets[0]);
    }
  };

  const tomarFoto = async () => {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Activa el acceso a la cámara en los ajustes del teléfono.');
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      setFotoAsset(resultado.assets[0]);
    }
  };

  const handleAdjuntarFoto = () => {
    Alert.alert('Foto de la incidencia', '¿Cómo quieres agregar la foto?', [
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Elegir de galería', onPress: elegirDeGaleria },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // Sube la foto al bucket privado "incidencias" y devuelve la ruta guardada
  const subirFotoIncidencia = async (userId: string): Promise<string | null> => {
    if (!fotoAsset) return null;
    const ext = fotoAsset.mimeType?.includes('png') ? 'png' : 'jpg';
    const contentType = fotoAsset.mimeType ?? 'image/jpeg';
    const path = `${userId}/${Date.now()}.${ext}`;

    // Se usa base64 -> ArrayBuffer en vez de fetch(uri).arrayBuffer(), por el mismo
    // motivo que en el avatar: en algunos dispositivos Android ese método truncaba
    // el archivo sin dar ningún error.
    if (!fotoAsset.base64) {
      throw new Error('No se pudo leer la foto. Intenta elegirla de nuevo.');
    }
    const arraybuffer = decode(fotoAsset.base64);
    if (arraybuffer.byteLength < 1000) {
      throw new Error('La foto no se leyó bien. Intenta elegirla de nuevo.');
    }

    const { error: uploadError } = await supabase.storage
      .from('incidencias')
      .upload(path, arraybuffer, { contentType, upsert: false });

    if (uploadError) {
      throw new Error(uploadError.message);
    }
    return path;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!canSubmit) {
      setError('Selecciona un tipo y describe la incidencia.');
      return;
    }
    if (!coords) {
      setError('No pudimos obtener tu ubicación. Activa el GPS e intenta de nuevo.');
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

    let fotoPath: string | null = null;
    if (fotoAsset) {
      try {
        fotoPath = await subirFotoIncidencia(user.id);
      } catch (e) {
        setLoading(false);
        setError('No se pudo subir la foto de la incidencia. Intenta con otra foto.');
        return;
      }
    }

    const { error: insertError } = await supabase.from('incidencias').insert({
      usuario_id: user.id,
      tipo,
      descripcion: descripcion.trim(),
      territorio: 'Cuenca', // El piloto del Índice ICIPAZ es solo Cuenca; la parroquia está en el perfil
      estado: 'pendiente',
      latitud: coords.latitud,
      longitud: coords.longitud,
      foto_url: fotoPath,
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
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 120 }} />
      </View>
    );
  }

  if (!tieneFoto) {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedIconWrap}>
          <Ionicons name="camera-outline" size={32} color={colors.accentDark} />
        </View>
        <Text style={styles.blockedTitle}>Falta tu foto de perfil</Text>
        <Text style={styles.blockedText}>
          Para reportar incidencias primero debes subir una foto de perfil — es una medida para evitar reportes falsos.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.submitButton, pressed && { opacity: 0.9 }]}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Perfil' } as never)}
        >
          <Ionicons name="person" size={16} color="#fff" />
          <Text style={styles.submitText}>Ir a mi perfil</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Reportar incidencia</Text>
        <Text style={styles.headerSubtitle}>Tu reporte ayuda a mejorar tu barrio</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* PASO 1: Tipo */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>¿Qué está pasando?</Text>
          </View>

          {CATEGORIAS.map((cat) => (
            <View key={cat.titulo} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <Ionicons name={cat.icono} size={13} color={colors.textMuted} />
                <Text style={styles.categoryTitle}>{cat.titulo}</Text>
              </View>
              <View style={styles.chipsWrap}>
                {cat.tipos.map((t) => {
                  const activo = tipo === t;
                  return (
                    <Pressable
                      key={t}
                      style={[styles.chip, activo && styles.chipActive]}
                      onPress={() => setTipo(t)}
                    >
                      {activo && <Ionicons name="checkmark" size={13} color="#fff" />}
                      <Text style={[styles.chipText, activo && styles.chipTextActive]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* PASO 2: Descripción */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Cuéntanos los detalles</Text>
          </View>
          <TextInput
            style={styles.textarea}
            placeholder="Qué ocurrió, cuándo y en qué contexto..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={descripcion}
            onChangeText={setDescripcion}
          />
        </View>

        {/* PASO 3: Foto */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>Foto de evidencia</Text>
            <Text style={styles.stepOptional}>opcional</Text>
          </View>

          {fotoAsset && <Image source={{ uri: fotoAsset.uri }} style={styles.photoPreview} />}

          <Pressable
            style={[styles.photoButton, fotoAsset && styles.photoButtonActive]}
            onPress={handleAdjuntarFoto}
          >
            <Ionicons
              name={fotoAsset ? 'checkmark-circle' : 'camera-outline'}
              size={20}
              color={fotoAsset ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.photoButtonText, fotoAsset && styles.photoButtonTextActive]}>
              {fotoAsset ? 'Foto adjuntada · Toca para cambiar' : 'Adjuntar foto'}
            </Text>
          </Pressable>
        </View>

        {/* PASO 4: Ubicación */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepTitle}>Tu ubicación</Text>
          </View>

          <View style={styles.locationRow}>
            {ubicacionEstado === 'buscando' && (
              <>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.locationText}>Obteniendo tu ubicación...</Text>
              </>
            )}
            {ubicacionEstado === 'ok' && coords && (
              <>
                <View style={styles.locationIconOk}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationOkText}>Ubicación detectada</Text>
                  <Text style={styles.locationCoords}>
                    {coords.latitud.toFixed(4)}, {coords.longitud.toFixed(4)} · Cuenca
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              </>
            )}
            {ubicacionEstado === 'error' && (
              <>
                <View style={styles.locationIconError}>
                  <Ionicons name="location-outline" size={16} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationErrorText}>No pudimos obtener tu ubicación</Text>
                  <Pressable onPress={obtenerUbicacion} hitSlop={6}>
                    <Text style={styles.locationRetry}>Reintentar</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={15} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
            pressed && canSubmit && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
          disabled={!canSubmit || loading}
          onPress={handleSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={16} color="#fff" />
              <Text style={styles.submitText}>Enviar reporte</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          Tu reporte es confidencial y se usa solo para los indicadores del Índice de Ciudades de Paz.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },

  header: { paddingHorizontal: 24, paddingBottom: 16 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 8,
  },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  body: { paddingHorizontal: 20, paddingBottom: 48 },

  stepCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 14,
    ...shadow,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stepTitle: { fontSize: 15.5, fontWeight: '800', color: colors.text, flex: 1 },
  stepOptional: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  categoryBlock: { marginBottom: 14 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  textarea: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  photoPreview: {
    width: '100%',
    height: 170,
    borderRadius: radius.md,
    marginBottom: 12,
    backgroundColor: '#f5f5f4',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  photoButtonActive: { borderColor: colors.primary, borderStyle: 'solid', backgroundColor: colors.primarySoft },
  photoButtonText: { fontSize: 13.5, color: colors.textMuted, fontWeight: '600' },
  photoButtonTextActive: { color: colors.primary, fontWeight: '700' },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 14,
  },
  locationText: { fontSize: 13, color: colors.textSecondary },
  locationIconOk: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOkText: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  locationCoords: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  locationIconError: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationErrorText: { fontSize: 13, fontWeight: '600', color: colors.text },
  locationRetry: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 4 },

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

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 17,
    ...shadowStrong,
  },
  submitButtonDisabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  disclaimer: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 18,
    paddingHorizontal: 20,
  },

  blockedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background },
  blockedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  blockedTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: 10, textAlign: 'center' },
  blockedText: { fontSize: 13.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 26 },
});
