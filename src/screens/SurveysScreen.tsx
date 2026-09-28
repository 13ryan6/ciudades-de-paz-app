import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

type Encuesta = {
  id: string;
  titulo: string;
  dimension: string;
  tiempo_estimado: string;
  territorio: string;
};

type Filtro = 'todos' | 'pendiente' | 'completada';

const TEAL = '#0f766e';
const AMBER = '#d97706';

export default function SurveysScreen() {
  const [loading, setLoading] = useState(true);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [completadasIds, setCompletadasIds] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const [encuestasRes, respuestasRes] = await Promise.all([
      supabase.from('encuestas').select('id, titulo, dimension, tiempo_estimado, territorio').eq('activa', true),
      supabase.from('respuestas_encuesta').select('encuesta_id').eq('usuario_id', user.id),
    ]);

    if (encuestasRes.data) setEncuestas(encuestasRes.data as Encuesta[]);
    if (respuestasRes.data) {
      setCompletadasIds(new Set(respuestasRes.data.map((r) => r.encuesta_id)));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const encuestasFiltradas = encuestas.filter((e) => {
    const completada = completadasIds.has(e.id);
    if (filtro === 'pendiente') return !completada;
    if (filtro === 'completada') return completada;
    return true;
  });

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
        <Text style={styles.headerTitle}>Encuestas</Text>
      </View>

      <View style={styles.filterRow}>
        {(['todos', 'pendiente', 'completada'] as Filtro[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterPill, filtro === f && styles.filterPillActive]}
            onPress={() => setFiltro(f)}
          >
            <Text style={[styles.filterText, filtro === f && styles.filterTextActive]}>
              {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : 'Completadas'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {encuestasFiltradas.length === 0 ? (
          <Text style={styles.emptyText}>No hay encuestas en esta categoría.</Text>
        ) : (
          encuestasFiltradas.map((e) => {
            const completada = completadasIds.has(e.id);
            return (
              <Pressable
                key={e.id}
                style={styles.card}
                onPress={() =>
                  completada
                    ? null
                    : Alert.alert('Próximo paso', 'Aquí abrirá el formulario de la encuesta.')
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{e.titulo}</Text>
                  <View style={[styles.statusPill, completada ? styles.statusDone : styles.statusPending]}>
                    <Text style={[styles.statusText, completada ? styles.statusTextDone : styles.statusTextPending]}>
                      {completada ? 'Completada' : 'Pendiente'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {e.territorio} · {e.tiempo_estimado} 
                </Text>
              </Pressable>
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
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f3f4f6' },
  filterPillActive: { backgroundColor: TEAL },
  filterText: { fontSize: 12.5, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 20, paddingTop: 14 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginTop: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 11.5, color: '#9ca3af', marginTop: 8 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusPending: { backgroundColor: '#fef3c7' },
  statusDone: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  statusTextPending: { color: '#92400e' },
  statusTextDone: { color: '#065f46' },
});
