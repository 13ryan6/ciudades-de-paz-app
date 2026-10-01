import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, shadowStrong } from '../constants/theme';

type Props = NativeStackScreenProps<any>;

type Profile = {
  nombre_completo: string;
  parroquia: string;
  canton: string;
  foto_url: string | null;
};

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

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');

  // Estadísticas de participación
  const [reportesCount, setReportesCount] = useState(0);
  const [encuestasCount, setEncuestasCount] = useState(0);
  const [asistenciasCount, setAsistenciasCount] = useState(0);

  // Edición
  const [editNombreVisible, setEditNombreVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [pickerParroquiaVisible, setPickerParroquiaVisible] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    setUserId(user.id);
    setEmail(user.email ?? '');

    const [profileRes, incidenciasRes, respuestasRes, asistenciasRes] = await Promise.all([
      supabase.from('profiles').select('nombre_completo, parroquia, canton, foto_url').eq('id', user.id).single(),
      supabase.from('incidencias').select('id').eq('usuario_id', user.id),
      supabase.from('respuestas_encuesta').select('id').eq('usuario_id', user.id),
      supabase.from('asistencias').select('id').eq('usuario_id', user.id),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    setReportesCount(incidenciasRes.data?.length ?? 0);
    setEncuestasCount(respuestasRes.data?.length ?? 0);
    setAsistenciasCount(asistenciasRes.data?.length ?? 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  // Sube el archivo elegido al bucket "avatars" y guarda la URL en profiles.foto_url
  const subirFoto = async (asset: ImagePicker.ImagePickerAsset) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    setUploading(true);
    try {
      const ext = asset.mimeType?.includes('png') ? 'png' : 'jpg';
      const contentType = asset.mimeType ?? 'image/jpeg';
      const path = `${user.id}/avatar.${ext}`;

      const response = await fetch(asset.uri);
      const arraybuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arraybuffer, { contentType, upsert: true });

      if (uploadError) {
        Alert.alert('No se pudo subir la foto', 'Intenta de nuevo.');
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // Parámetro con la hora para refrescar la imagen aunque el nombre sea el mismo
      const urlConCacheBuster = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ foto_url: urlConCacheBuster })
        .eq('id', user.id);

      if (updateError) {
        Alert.alert('No se pudo guardar la foto en tu perfil', updateError.message);
        return;
      }

      setProfile((prev) => (prev ? { ...prev, foto_url: urlConCacheBuster } : prev));
    } catch (e) {
      Alert.alert('Error inesperado', 'No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const elegirDeGaleria = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Activa el acceso a tus fotos en los ajustes del teléfono.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      await subirFoto(resultado.assets[0]);
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
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!resultado.canceled && resultado.assets[0]) {
      await subirFoto(resultado.assets[0]);
    }
  };

  const handleCambiarFoto = () => {
    Alert.alert('Foto de perfil', '¿Cómo quieres subir tu foto?', [
      { text: 'Tomar foto', onPress: tomarFoto },
      { text: 'Elegir de galería', onPress: elegirDeGaleria },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const guardarNombre = async () => {
    const nombre = nuevoNombre.trim();
    if (nombre.length < 3) {
      Alert.alert('Nombre muy corto', 'Escribe tu nombre completo.');
      return;
    }
    setGuardandoNombre(true);
    const { error } = await supabase
      .from('profiles')
      .update({ nombre_completo: nombre })
      .eq('id', userId);
    setGuardandoNombre(false);

    if (error) {
      Alert.alert('No se pudo guardar', 'Intenta de nuevo.');
      return;
    }
    setProfile((prev) => (prev ? { ...prev, nombre_completo: nombre } : prev));
    setEditNombreVisible(false);
  };

  const cambiarParroquia = async (nuevaParroquia: string) => {
    setPickerParroquiaVisible(false);
    const { error } = await supabase
      .from('profiles')
      .update({ parroquia: nuevaParroquia })
      .eq('id', userId);

    if (error) {
      Alert.alert('No se pudo actualizar', 'Intenta de nuevo.');
      return;
    }
    setProfile((prev) => (prev ? { ...prev, parroquia: nuevaParroquia } : prev));
  };

  const handleCambiarPassword = async () => {
    if (!email) return;
    setLoadingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoadingReset(false);

    if (error) {
      Alert.alert('No se pudo enviar', 'Intenta de nuevo en unos minutos.');
      return;
    }
    Alert.alert(
      'Correo enviado',
      'Te enviamos un enlace para cambiar tu contraseña. Revisa tu correo (y la carpeta de spam).'
    );
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          const rootNav = navigation.getParent() ?? navigation;
          // @ts-ignore - navegación a la pila raíz fuera del TabNavigator
          rootNav.reset({ index: 0, routes: [{ name: 'Splash' }] });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const nombreCompleto = profile?.nombre_completo || 'Ciudadano';
  const tieneFoto = !!profile?.foto_url;

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header con gradiente y avatar */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 24 }]}
        >
          <View style={styles.headerCircle} />
          <View style={styles.avatarWrap}>
            {tieneFoto ? (
              <Image source={{ uri: profile!.foto_url! }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{nombreCompleto.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            <Pressable style={styles.cameraBadge} onPress={handleCambiarFoto} disabled={uploading} hitSlop={6}>
              <Ionicons name="camera" size={15} color="#fff" />
            </Pressable>
          </View>

          <Text style={styles.headerName}>{nombreCompleto}</Text>
          <View style={styles.headerLocationRow}>
            <Ionicons name="location" size={12} color="rgba(255,255,255,0.75)" />
            <Text style={styles.headerLocation}>
              {profile?.parroquia}{profile?.canton ? `, ${profile.canton}` : ''}
            </Text>
          </View>
        </LinearGradient>

        {/* Estadísticas de participación */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{reportesCount}</Text>
            <Text style={styles.statLabel}>Reportes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{encuestasCount}</Text>
            <Text style={styles.statLabel}>Encuestas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{asistenciasCount}</Text>
            <Text style={styles.statLabel}>Actividades</Text>
          </View>
        </View>

        {/* Mi cuenta */}
        <Text style={styles.sectionTitle}>Mi cuenta</Text>
        <View style={styles.menuCard}>
          <MenuRow
            icono="person-outline"
            iconoBg={colors.primarySoft}
            iconoColor={colors.primary}
            titulo="Nombre completo"
            valor={nombreCompleto}
            onPress={() => {
              setNuevoNombre(nombreCompleto);
              setEditNombreVisible(true);
            }}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icono="map-outline"
            iconoBg={colors.successSoft}
            iconoColor={colors.success}
            titulo="Mi parroquia"
            valor={profile?.parroquia || 'Sin definir'}
            onPress={() => setPickerParroquiaVisible(true)}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icono="mail-outline"
            iconoBg={colors.infoSoft}
            iconoColor={colors.info}
            titulo="Correo electrónico"
            valor={email}
          />
        </View>

        {/* Configuración */}
        <Text style={styles.sectionTitle}>Configuración</Text>
        <View style={styles.menuCard}>
          <MenuRow
            icono="lock-closed-outline"
            iconoBg={colors.accentSoft}
            iconoColor={colors.accentDark}
            titulo="Cambiar contraseña"
            valor={loadingReset ? 'Enviando correo...' : 'Te llega un enlace al correo'}
            onPress={loadingReset ? undefined : handleCambiarPassword}
          />
          <View style={styles.menuDivider} />
          <MenuRow
            icono="document-text-outline"
            iconoBg={colors.primarySoft}
            iconoColor={colors.primary}
            titulo="Política de privacidad"
            valor="Tratamiento de datos (LOPDP)"
            onPress={() => {
              const rootNav = navigation.getParent() ?? navigation;
              // @ts-ignore - pantalla de la pila raíz
              rootNav.navigate('PrivacyPolicy');
            }}
          />
        </View>

        {/* Cerrar sesión */}
        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.85 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={17} color={colors.error} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>

        <Text style={styles.version}>Ciudadanía ICIPAZ · v1.0.0</Text>
      </ScrollView>

      {/* Modal: editar nombre */}
      <Modal visible={editNombreVisible} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Editar nombre</Text>
            <TextInput
              style={styles.modalInput}
              value={nuevoNombre}
              onChangeText={setNuevoNombre}
              placeholder="Tu nombre completo"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setEditNombreVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSave, guardandoNombre && { opacity: 0.6 }]}
                onPress={guardarNombre}
                disabled={guardandoNombre}
              >
                {guardandoNombre ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: cambiar parroquia */}
      <Modal visible={pickerParroquiaVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPickerParroquiaVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Cambiar parroquia</Text>
            <FlatList
              data={PARROQUIA_LIST}
              keyExtractor={(item, index) => item.label + index}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) =>
                item.type === 'header' ? (
                  <Text style={styles.modalSectionHeader}>{item.label}</Text>
                ) : (
                  <Pressable style={styles.modalItem} onPress={() => cambiarParroquia(item.label)}>
                    <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.modalItemText}>{item.label}</Text>
                    {profile?.parroquia === item.label && (
                      <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
                    )}
                  </Pressable>
                )
              }
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// Fila del menú de opciones (ícono + título + valor + chevron opcional)
function MenuRow({
  icono,
  iconoBg,
  iconoColor,
  titulo,
  valor,
  onPress,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  iconoBg: string;
  iconoColor: string;
  titulo: string;
  valor: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, pressed && onPress && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: iconoBg }]}>
        <Ionicons name={icono} size={17} color={iconoColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitulo}>{titulo}</Text>
        <Text style={styles.menuValor} numberOfLines={1}>{valor}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
    </Pressable>
  );
}

const AVATAR_SIZE = 104;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: {
    alignItems: 'center',
    paddingBottom: 56,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    top: -70,
    right: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE, marginBottom: 14 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 38, fontWeight: '800' },
  avatarOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  headerName: { fontSize: 21, fontWeight: '800', color: '#fff' },
  headerLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  headerLocation: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginHorizontal: 20,
    marginTop: -30,
    paddingVertical: 18,
    ...shadowStrong,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 3, fontWeight: '500' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 24,
    marginTop: 26,
    marginBottom: 10,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginHorizontal: 20,
    paddingVertical: 4,
    ...shadow,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitulo: { fontSize: 14, fontWeight: '700', color: colors.text },
  menuValor: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  menuDivider: { height: 1, backgroundColor: colors.border, marginLeft: 66 },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    marginHorizontal: 20,
    marginTop: 28,
    paddingVertical: 15,
  },
  logoutText: { color: colors.error, fontSize: 14.5, fontWeight: '700' },

  version: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 22,
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 22,
    ...shadowStrong,
  },
  modalCardTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 14 },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  modalCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  modalSave: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  modalSaveText: { color: '#fff', fontSize: 14, fontWeight: '700' },

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
  modalItemText: { flex: 1, fontSize: 15, color: colors.text },
});