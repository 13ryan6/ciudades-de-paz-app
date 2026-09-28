import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type Profile = {
  nombre_completo: string;
  parroquia: string;
  canton: string;
  foto_url: string | null;
};

const TEAL = '#0f766e';
const AMBER = '#d97706';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    setEmail(user.email ?? '');
    const { data } = await supabase
      .from('profiles')
      .select('nombre_completo, parroquia, canton, foto_url')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data as Profile);
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
        Alert.alert('No se pudo subir la foto', uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // Se agrega un parámetro con la hora para que la imagen se refresque
      // aunque el nombre de archivo sea el mismo que antes.
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={TEAL} size="large" />
      </View>
    );
  }

  const nombreCorto = profile?.nombre_completo || 'Ciudadano';
  const tieneFoto = !!profile?.foto_url;

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        {tieneFoto ? (
          <Image source={{ uri: profile!.foto_url! }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{nombreCorto.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {uploading && (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>

      <Pressable style={styles.changeButton} onPress={handleCambiarFoto} disabled={uploading}>
        <Text style={styles.changeButtonText}>{tieneFoto ? 'Cambiar foto' : 'Subir foto de perfil'}</Text>
      </Pressable>

      <Text style={styles.name}>{nombreCorto}</Text>
      <Text style={styles.detail}>{email}</Text>
      {!!profile?.parroquia && (
        <Text style={styles.detail}>
          {profile.parroquia}{profile.canton ? `, ${profile.canton}` : ''}
        </Text>
      )}

      {!tieneFoto && (
        <Text style={styles.hint}>
          Necesitas una foto de perfil para poder reportar incidencias.
        </Text>
      )}
    </View>
  );
}

const AVATAR_SIZE = 112;

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', backgroundColor: '#fff', paddingTop: 48, paddingHorizontal: 24 },
  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE, marginBottom: 16 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: '#e5e7eb' },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 36, fontWeight: '700' },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeButton: {
    backgroundColor: AMBER,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  changeButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  name: { fontSize: 18, fontWeight: '600', color: '#111827' },
  detail: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  hint: { fontSize: 12.5, color: '#9ca3af', textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
