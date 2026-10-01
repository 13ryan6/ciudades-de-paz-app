import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow } from '../constants/theme';

type Props = NativeStackScreenProps<any>;

type Actividad = { id: string; titulo: string; fecha: string; organizacion: string };
type Filtro = 'todas' | 'confirmadas';

export default function ActivitiesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [confirmadasIds, setConfirmadasIds] = useState<Set<string>>(new Set());
  const [reportesCount, setReportesCount] = useState(0);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [tieneFoto, setTieneFoto] = useState(true);

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const [actividadesRes, asistenciasRes, incidenciasRes, profileRes] = await Promise.all([
      supabase.from('actividades').select('id, titulo, fecha, organizacion').order('fecha', { ascending: true }),
      supabase.from('asistencias').select('actividad_id').eq('usuario_id', user.id),
      supabase.from('incidencias').select('id').eq('usuario_id', user.id),
      supabase.from('profiles').select('foto_url').eq('id', user.id).single(),
    ]);

    if (actividadesRes.data) setActividades(actividadesRes.data as Actividad[]);
    if (asistenciasRes.data) setConfirmadasIds(new Set(asistenciasRes.data.map((a) => a.actividad_id)));
    setReportesCount(incidenciasRes.data?.length ?? 0);
    setTieneFoto(!!profileRes.data?.foto_url);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const confirmarAsistencia = async (actividadId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const { error } = await supabase.from('asistencias').insert({ actividad_id: actividadId, usuario_id: user.id });
    if (error) {
      Alert.alert('No se pudo confirmar', error.message);
      return;
    }
    setConfirmadasIds((prev) => new Set(prev).add(actividadId));
  };

  const actividadesFiltradas = actividades.filter((a) =>
    filtro === 'confirmadas' ? confirmadasIds.has(a.id) : true
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.headerTitle}>Actividades</Text>
          <Text style={styles.headerSubtitle}>Participa en tu comunidad</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.reportButton, pressed && { opacity: 0.85 }]}
          onPress={() => {
            if (!tieneFoto) {
              Alert.alert(
                'Falta tu foto de perfil',
                'Para reportar incidencias primero debes subir una foto de perfil.',
                [
                  { text: 'Ir a mi perfil', onPress: () => navigation.navigate('Perfil') },
                  { text: 'Cancelar', style: 'cancel' },
                ]
              );
              return;
            }
            navigation.getParent()
              ? navigation.getParent()!.navigate('ReportIncident' as never)
              : Alert.alert('Próximo paso', 'Aquí abrirá el formulario de reporte de incidencia.');
          }}
        >
          <Ionicons name="megaphone" size={13} color="#fff" />
          <Text style={styles.reportButtonText}>Reportar</Text>
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {(['todas', 'confirmadas'] as Filtro[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterPill, filtro === f && styles.filterPillActive]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filterText, filtro === f && styles.filterTextActive]}>
              {f === 'todas' ? 'Todas' : 'Confirmadas'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Pressable
          style={({ pressed }) => [styles.reportsRow, pressed && { opacity: 0.9 }]}
          onPress={() =>
            navigation.getParent()
              ? navigation.getParent()!.navigate('MyReports' as never)
              : Alert.alert('Próximo paso', 'Aquí verás la lista de tus reportes.')
          }
        >
          <View style={styles.reportsIconWrap}>
            <Ionicons name="document-text" size={17} color={colors.accentDark} />
          </View>
          <Text style={styles.reportsRowText}>Mis reportes de incidencias</Text>
          <View style={styles.reportsBadge}>
            <Text style={styles.reportsBadgeText}>{reportesCount}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.accentDark} />
        </Pressable>

        {actividadesFiltradas.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-outline" size={30} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>No hay actividades en esta categoría.</Text>
          </View>
        ) : (
          actividadesFiltradas.map((a) => {
            const confirmada = confirmadasIds.has(a.id);
            return (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar" size={11} color={colors.primary} />
                    <Text style={styles.dateBadgeText}>{a.fecha}</Text>
                  </View>
                  {confirmada && (
                    <View style={styles.confirmedBadge}>
                      <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                      <Text style={styles.confirmedBadgeText}>Confirmada</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardTitle}>{a.titulo}</Text>
                <View style={styles.orgRow}>
                  <Ionicons name="business-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.cardMeta}>{a.organizacion}</Text>
                </View>
                <Pressable
                  style={[styles.confirmButton, confirmada && styles.confirmButtonDone]}
                  disabled={confirmada}
                  onPress={() => confirmarAsistencia(a.id)}
                >
                  <Ionicons
                    name={confirmada ? 'checkmark-done' : 'hand-left-outline'}
                    size={15}
                    color={confirmada ? colors.textMuted : '#fff'}
                  />
                  <Text style={[styles.confirmButtonText, confirmada && styles.confirmButtonTextDone]}>
                    {confirmada ? 'Asistencia confirmada' : 'Confirmar asistencia'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    ...shadow,
  },
  reportButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, paddingBottom: 14 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    ...shadow,
  },
  filterPillActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12.5, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: 20, paddingBottom: 24 },

  reportsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: 15,
    marginBottom: 18,
  },
  reportsIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportsRowText: { flex: 1, fontSize: 13.5, fontWeight: '700', color: '#92400e' },
  reportsBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  reportsBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...shadow,
  },
  emptyText: { fontSize: 13.5, color: colors.textMuted },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 12,
    ...shadow,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateBadgeText: { fontSize: 10.5, fontWeight: '700', color: colors.primary },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successSoft,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confirmedBadgeText: { fontSize: 10.5, fontWeight: '700', color: colors.success },
  cardTitle: { fontSize: 15.5, fontWeight: '700', color: colors.text },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, marginBottom: 14 },
  cardMeta: { fontSize: 12, color: colors.textMuted },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  confirmButtonDone: { backgroundColor: '#f5f5f4' },
  confirmButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  confirmButtonTextDone: { color: colors.textMuted },
});