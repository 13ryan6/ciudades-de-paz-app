// MyReportsScreen.tsx
import { useCallback, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<any>;

type Incidencia = {
  id: string;
  tipo: string;
  estado: string;
  descripcion: string;
  foto_url: string | null;
  created_at: string;
};

const TEAL = '#0f766e';

const ESTADO_STYLE: Record<string, { bg: string; text: string }> = {
  pendiente: { bg: '#fef3c7', text: '#92400e' },
  'en revisión': { bg: '#dbeafe', text: '#1e40af' },
  resuelto: { bg: '#d1fae5', text: '#065f46' },
};

export default function MyReportsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  // Mapa de ruta del archivo -> URL firmada temporal para mostrar la foto
  const [fotosFirmadas, setFotosFirmadas] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data } = await supabase
      .from('incidencias')
      .select('id, tipo, estado, descripcion, foto_url, created_at')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false });

    if (!data) return;
    setIncidencias(data as Incidencia[]);

    // El bucket "incidencias" es privado: hay que generar URLs firmadas
    // temporales para poder mostrar las fotos dentro de la app.
    const paths = data
      .map((i) => i.foto_url)
      .filter((p): p is string => !!p);

    if (paths.length > 0) {
      const { data: urls } = await supabase.storage
        .from('incidencias')
        .createSignedUrls(paths, 3600); // válidas por 1 hora

      const mapa: Record<string, string> = {};
      urls?.forEach((u) => {
        if (u.path && u.signedUrl) mapa[u.path] = u.signedUrl;
      });
      setFotosFirmadas(mapa);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Mis reportes</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={TEAL} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {incidencias.length === 0 ? (
            <Text style={styles.emptyText}>Todavía no has reportado ninguna incidencia.</Text>
          ) : (
            incidencias.map((i) => {
              const style = ESTADO_STYLE[i.estado] ?? ESTADO_STYLE.pendiente;
              const fotoFirmada = i.foto_url ? fotosFirmadas[i.foto_url] : null;
              return (
                <View key={i.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{i.tipo}</Text>
                    <View style={[styles.pill, { backgroundColor: style.bg }]}>
                      <Text style={[styles.pillText, { color: style.text }]}>{i.estado}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDescription} numberOfLines={3}>
                    {i.descripcion}
                  </Text>
                  {fotoFirmada && (
                    <Image source={{ uri: fotoFirmada }} style={styles.cardPhoto} />
                  )}
                  <Text style={styles.cardDate}>
                    {new Date(i.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backButton: { marginBottom: 10 },
  backText: { color: TEAL, fontSize: 14, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  list: { padding: 20 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  cardDescription: { fontSize: 13, color: '#4b5563', lineHeight: 19, marginTop: 8 },
  cardPhoto: { width: '100%', height: 160, borderRadius: 10, marginTop: 10, backgroundColor: '#f3f4f6' },
  cardDate: { fontSize: 11.5, color: '#9ca3af', marginTop: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 10.5, fontWeight: '700' },
});