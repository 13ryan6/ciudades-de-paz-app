import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<any>;

type Actividad = { id: string; titulo: string; fecha: string; organizacion: string };
type Filtro = 'todas' | 'confirmadas';

const TEAL = '#0f766e';
const AMBER = '#d97706';

export default function ActivitiesScreen({ navigation }: Props) {
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
        <ActivityIndicator color={TEAL} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Actividades</Text>
        <Pressable
          style={styles.reportButton}
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
          <Text style={styles.reportButtonText}>+ Reportar</Text>
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

      <ScrollView contentContainerStyle={styles.list}>
        <Pressable
          style={styles.reportsRow}
          onPress={() =>
            navigation.getParent()
              ? navigation.getParent()!.navigate('MyReports' as never)
              : Alert.alert('Próximo paso', 'Aquí verás la lista de tus reportes.')
          }
        >
          <Text style={styles.reportsRowText}>Mis reportes de incidencias</Text>
          <Text style={styles.reportsRowCount}>{reportesCount} ›</Text>
        </Pressable>

        {actividadesFiltradas.length === 0 ? (
          <Text style={styles.emptyText}>No hay actividades en esta categoría.</Text>
        ) : (
          actividadesFiltradas.map((a) => {
            const confirmada = confirmadasIds.has(a.id);
            return (
              <View key={a.id} style={styles.card}>
                <Text style={styles.cardTitle}>{a.titulo}</Text>
                <Text style={styles.cardMeta}>{a.fecha} · {a.organizacion}</Text>
                <Pressable
                  style={[styles.confirmButton, confirmada && styles.confirmButtonDone]}
                  disabled={confirmada}
                  onPress={() => confirmarAsistencia(a.id)}
                >
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
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  reportButton: { backgroundColor: AMBER, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  reportButtonText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6' },
  filterPillActive: { backgroundColor: TEAL },
  filterText: { fontSize: 12.5, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 20, paddingTop: 14 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  reportsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff7ed', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#fed7aa',
  },
  reportsRowText: { fontSize: 13, fontWeight: '600', color: '#9a3412' },
  reportsRowCount: { fontSize: 13, fontWeight: '700', color: AMBER },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 11.5, color: '#9ca3af', marginTop: 4, marginBottom: 12 },
  confirmButton: { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  confirmButtonDone: { backgroundColor: '#f3f4f6' },
  confirmButtonText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },
  confirmButtonTextDone: { color: '#9ca3af' },
});