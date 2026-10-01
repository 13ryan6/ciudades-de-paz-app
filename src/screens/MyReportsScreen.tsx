// MyReportsScreen.tsx
import { useCallback, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow } from '../constants/theme';

type Props = NativeStackScreenProps<any>;

type Incidencia = {
  id: string;
  tipo: string;
  estado: string;
  descripcion: string;
  foto_url: string | null;
  latitud: number | null;
  longitud: number | null;
  created_at: string;
};

const ESTADO_STYLE: Record<string, { bg: string; text: string; borde: string; icono: keyof typeof Ionicons.glyphMap }> = {
  pendiente: { bg: colors.accentSoft, text: '#92400e', borde: colors.accent, icono: 'time' },
  'en revisión': { bg: colors.infoSoft, text: colors.info, borde: '#3b82f6', icono: 'search' },
  resuelto: { bg: colors.successSoft, text: colors.success, borde: colors.success, icono: 'checkmark-circle' },
};

// Ícono según el tipo de incidencia reportada
function iconoPorTipo(tipo: string): keyof typeof Ionicons.glyphMap {
  const t = tipo.toLowerCase();
  if (t.includes('acoso') || t.includes('robo') || t.includes('inseguridad') || t.includes('violencia') || t.includes('conflicto')) return 'shield-half-outline';
  if (t.includes('agua')) return 'water-outline';
  if (t.includes('basura')) return 'trash-bin-outline';
  if (t.includes('incendio') || t.includes('quema')) return 'flame-outline';
  if (t.includes('contaminación') || t.includes('ambiental')) return 'leaf-outline';
  if (t.includes('iluminación')) return 'bulb-outline';
  if (t.includes('espacio público')) return 'business-outline';
  return 'megaphone-outline';
}

export default function MyReportsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [fotosFirmadas, setFotosFirmadas] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data } = await supabase
      .from('incidencias')
      .select('id, tipo, estado, descripcion, foto_url, latitud, longitud, created_at')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false });

    if (!data) return;
    setIncidencias(data as Incidencia[]);

    // El bucket "incidencias" es privado: URLs firmadas temporales para mostrar fotos
    const paths = data.map((i) => i.foto_url).filter((p): p is string => !!p);

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

  const conteoPorEstado = (estado: string) => incidencias.filter((i) => i.estado === estado).length;

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Mis reportes</Text>
        <Text style={styles.headerSubtitle}>Sigue el estado de tus incidencias</Text>

        {/* Resumen por estado */}
        {incidencias.length > 0 && (
          <View style={styles.resumenRow}>
            <ResumenPill
              icono="time"
              color="#92400e"
              bg={colors.accentSoft}
              cantidad={conteoPorEstado('pendiente')}
              etiqueta="Pendientes"
            />
            <ResumenPill
              icono="search"
              color={colors.info}
              bg={colors.infoSoft}
              cantidad={conteoPorEstado('en revisión')}
              etiqueta="En revisión"
            />
            <ResumenPill
              icono="checkmark-circle"
              color={colors.success}
              bg={colors.successSoft}
              cantidad={conteoPorEstado('resuelto')}
              etiqueta="Resueltos"
            />
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {incidencias.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="megaphone-outline" size={30} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>Sin reportes todavía</Text>
              <Text style={styles.emptyText}>Cuando reportes una incidencia, aparecerá aquí con su estado.</Text>
            </View>
          ) : (
            incidencias.map((i) => {
              const estilo = ESTADO_STYLE[i.estado] ?? ESTADO_STYLE.pendiente;
              const fotoFirmada = i.foto_url ? fotosFirmadas[i.foto_url] : null;
              return (
                <View key={i.id} style={[styles.card, { borderLeftColor: estilo.borde }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.tipoIconWrap, { backgroundColor: estilo.bg }]}>
                      <Ionicons name={iconoPorTipo(i.tipo)} size={18} color={estilo.text} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{i.tipo}</Text>
                      <View style={styles.cardDateRow}>
                        <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.cardDate}>
                          {new Date(i.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.pill, { backgroundColor: estilo.bg }]}>
                      <Ionicons name={estilo.icono} size={10} color={estilo.text} />
                      <Text style={[styles.pillText, { color: estilo.text }]}>{i.estado}</Text>
                    </View>
                  </View>

                  <Text style={styles.cardDescription} numberOfLines={3}>
                    {i.descripcion}
                  </Text>

                  {fotoFirmada && (
                    <Image source={{ uri: fotoFirmada }} style={styles.cardPhoto} />
                  )}

                  {i.latitud != null && i.longitud != null && (
                    <View style={styles.cardLocationRow}>
                      <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                      <Text style={styles.cardLocation}>
                        {i.latitud.toFixed(4)}, {i.longitud.toFixed(4)} · Cuenca
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

// Pastilla del resumen de estados (arriba de la lista)
function ResumenPill({
  icono,
  color,
  bg,
  cantidad,
  etiqueta,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  cantidad: number;
  etiqueta: string;
}) {
  return (
    <View style={[styles.resumenPill, { backgroundColor: bg }]}>
      <Ionicons name={icono} size={14} color={color} />
      <Text style={[styles.resumenCantidad, { color }]}>{cantidad}</Text>
      <Text style={[styles.resumenEtiqueta, { color }]}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

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

  resumenRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  resumenPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  resumenCantidad: { fontSize: 14, fontWeight: '800' },
  resumenEtiqueta: { fontSize: 10.5, fontWeight: '600' },

  list: { paddingHorizontal: 20, paddingBottom: 24 },

  emptyState: { alignItems: 'center', marginTop: 70, paddingHorizontal: 30 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadow,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...shadow,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 19 },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  cardDate: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  pillText: { fontSize: 10.5, fontWeight: '700' },

  cardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginTop: 12,
  },
  cardPhoto: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
    marginTop: 12,
    backgroundColor: '#f5f5f4',
  },
  cardLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  cardLocation: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
});