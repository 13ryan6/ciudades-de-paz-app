import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow } from '../constants/theme';

type Encuesta = {
  id: string;
  titulo: string;
  dimension: string;
  tiempo_estimado: string;
  territorio: string;
};

type Filtro = 'todos' | 'pendiente' | 'completada';

export default function SurveysScreen() {
  const insets = useSafeAreaInsets();
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

  const pendientesCount = encuestas.filter((e) => !completadasIds.has(e.id)).length;

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
        <Text style={styles.headerTitle}>Encuestas</Text>
        <Text style={styles.headerSubtitle}>
          {pendientesCount === 0
            ? 'Has contestado todas las encuestas activas 🎉'
            : `Tienes ${pendientesCount} encuesta${pendientesCount !== 1 ? 's' : ''} por contestar`}
        </Text>
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

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {encuestasFiltradas.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="clipboard-outline" size={30} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyText}>No hay encuestas en esta categoría.</Text>
          </View>
        ) : (
          encuestasFiltradas.map((e) => {
            const completada = completadasIds.has(e.id);
            return (
              <Pressable
                key={e.id}
                style={({ pressed }) => [styles.card, pressed && !completada && styles.cardPressed]}
                onPress={() =>
                  completada
                    ? null
                    : Alert.alert('Próximo paso', 'Aquí abrirá el formulario de la encuesta.')
                }
              >
                <View style={[styles.cardIconWrap, completada && styles.cardIconWrapDone]}>
                  <Ionicons
                    name={completada ? 'checkmark-circle' : 'clipboard'}
                    size={20}
                    color={completada ? colors.success : colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{e.titulo}</Text>
                  <View style={styles.cardMetaRow}>
                    <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                    <Text style={styles.cardMeta}>{e.territorio}</Text>
                    <Ionicons name="time-outline" size={11} color={colors.textMuted} style={{ marginLeft: 8 }} />
                    <Text style={styles.cardMeta}>{e.tiempo_estimado}</Text>
                  </View>
                </View>
                <View style={[styles.statusPill, completada ? styles.statusDone : styles.statusPending]}>
                  <Text style={[styles.statusText, completada ? styles.statusTextDone : styles.statusTextPending]}>
                    {completada ? 'Completada' : 'Pendiente'}
                  </Text>
                </View>
              </Pressable>
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

  header: { paddingHorizontal: 24, paddingBottom: 14, backgroundColor: colors.background },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

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

  emptyState: { alignItems: 'center', marginTop: 60 },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 10,
    ...shadow,
  },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  cardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapDone: { backgroundColor: colors.successSoft },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  cardMeta: { fontSize: 11.5, color: colors.textMuted },

  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusPending: { backgroundColor: colors.accentSoft },
  statusDone: { backgroundColor: colors.successSoft },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  statusTextPending: { color: '#92400e' },
  statusTextDone: { color: colors.success },
});
