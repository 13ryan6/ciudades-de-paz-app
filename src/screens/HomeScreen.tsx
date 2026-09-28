import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<any>;

type Profile = {
  nombre_completo: string;
  parroquia: string;
  canton: string;
  foto_url: string | null;
};

type Encuesta = { id: string; titulo: string; dimension: string; tiempo_estimado: string };
type Actividad = { id: string; titulo: string; fecha: string; organizacion: string };

const TEAL = '#0f766e';
const AMBER = '#d97706';

export default function HomeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [encuestasCount, setEncuestasCount] = useState(0);
  const [reportesCount, setReportesCount] = useState(0);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);

  const loadData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const [profileRes, encuestasRes, incidenciasRes, actividadesRes] = await Promise.all([
      supabase.from('profiles').select('nombre_completo, parroquia, canton, foto_url').eq('id', user.id).single(),
      supabase.from('encuestas').select('id, titulo, dimension, tiempo_estimado').eq('activa', true),
      supabase.from('incidencias').select('id').eq('usuario_id', user.id),
      supabase.from('actividades').select('id, titulo, fecha, organizacion').order('fecha', { ascending: true }),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (encuestasRes.data) setEncuestas(encuestasRes.data as Encuesta[]);
    setEncuestasCount(encuestasRes.data?.length ?? 0);
    setReportesCount(incidenciasRes.data?.length ?? 0);
    if (actividadesRes.data) setActividades(actividadesRes.data as Actividad[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const rootNav = navigation.getParent() ?? navigation;
    // @ts-ignore - navegación a la pila raíz fuera del TabNavigator
    rootNav.reset({ index: 0, routes: [{ name: 'Splash' }] });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={TEAL} size="large" />
      </View>
    );
  }

  const nombreCorto = profile?.nombre_completo?.split(' ')[0] || 'Ciudadano';
  const tieneFoto = !!profile?.foto_url;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEAL} />}
    >
      {/* Tarjeta de perfil */}
      <View style={styles.profileRow}>
        {tieneFoto ? (
          <Image source={{ uri: profile!.foto_url! }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{nombreCorto.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.name}>{nombreCorto}</Text>
          <Text style={styles.territory}>{profile?.parroquia}, {profile?.canton}</Text>
        </View>
      </View>

      {/* Banner de foto pendiente */}
      {!tieneFoto && (
        <Pressable style={styles.banner} onPress={() => navigation.navigate('Perfil')}>
          <Text style={styles.bannerText}>
            Sube tu foto de perfil para poder reportar incidencias
          </Text>
          <Text style={styles.bannerAction}>Subir foto ›</Text>
        </Pressable>
      )}

      {/* Tarjetas resumen */}
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{encuestasCount}</Text>
          <Text style={styles.cardLabel}>Encuestas pendientes</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{actividades.length}</Text>
          <Text style={styles.cardLabel}>Actividades cercanas</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>{reportesCount}</Text>
          <Text style={styles.cardLabel}>Mis reportes</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValueSmall}>{profile?.parroquia || '—'}</Text>
          <Text style={styles.cardLabel}>Mi territorio</Text>
        </View>
      </View>

      {/* Actividades destacadas */}
      <Text style={styles.sectionTitle}>Actividades cerca de ti</Text>
      {actividades.length === 0 ? (
        <Text style={styles.emptyText}>Todavía no hay actividades registradas.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
          {actividades.map((a) => (
            <View key={a.id} style={styles.activityCard}>
              <Text style={styles.activityTitle} numberOfLines={2}>{a.titulo}</Text>
              <Text style={styles.activityMeta}>{a.fecha} · {a.organizacion}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Encuestas activas */}
      <Text style={styles.sectionTitle}>Encuestas activas</Text>
      {encuestas.length === 0 ? (
        <Text style={styles.emptyText}>No hay encuestas activas por ahora.</Text>
      ) : (
        encuestas.map((e) => (
          <Pressable key={e.id} style={styles.surveyCard}>
            <Text style={styles.surveyTitle}>{e.titulo}</Text>
            <Text style={styles.surveyMeta}>{e.tiempo_estimado}</Text>
          </Pressable>
        ))
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: TEAL,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 22, fontWeight: '700' },
  greeting: { fontSize: 12, color: '#9ca3af' },
  name: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: -2 },
  territory: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  banner: {
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 14, padding: 14, marginBottom: 18,
  },
  bannerText: { color: '#92400e', fontSize: 13, marginBottom: 4 },
  bannerAction: { color: AMBER, fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  card: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  cardValueSmall: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardLabel: { fontSize: 11.5, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10, marginTop: 4 },
  emptyText: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  hScroll: { marginBottom: 24 },
  activityCard: {
    width: 170, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginRight: 10,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  activityTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  activityMeta: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
  surveyCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  surveyTitle: { fontSize: 13.5, fontWeight: '600', color: '#111827' },
  surveyMeta: { fontSize: 11.5, color: '#9ca3af', marginTop: 4 },
  logoutButton: { alignItems: 'center', paddingVertical: 16, marginTop: 12 },
  logoutText: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
});