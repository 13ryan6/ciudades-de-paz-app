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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, spacing } from '../constants/theme';

type Props = NativeStackScreenProps<any>;

type Profile = {
  nombre_completo: string;
  parroquia: string;
  canton: string;
  foto_url: string | null;
};

type Encuesta = { id: string; titulo: string; dimension: string; tiempo_estimado: string };
type Actividad = { id: string; titulo: string; fecha: string; organizacion: string };

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
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

    const [profileRes, encuestasRes, incidenciasRes, actividadesRes, respuestasRes] = await Promise.all([
      supabase.from('profiles').select('nombre_completo, parroquia, canton, foto_url').eq('id', user.id).single(),
      supabase.from('encuestas').select('id, titulo, dimension, tiempo_estimado').eq('activa', true),
      supabase.from('incidencias').select('id').eq('usuario_id', user.id),
      supabase.from('actividades').select('id, titulo, fecha, organizacion').order('fecha', { ascending: true }),
      supabase.from('respuestas_encuesta').select('encuesta_id').eq('usuario_id', user.id),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (encuestasRes.data) setEncuestas(encuestasRes.data as Encuesta[]);
    // Pendientes = encuestas activas que el usuario todavía no ha contestado
    const contestadas = new Set((respuestasRes.data ?? []).map((r) => r.encuesta_id));
    setEncuestasCount((encuestasRes.data ?? []).filter((e) => !contestadas.has(e.id)).length);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const nombreCorto = profile?.nombre_completo?.split(' ')[0] || 'Ciudadano';
  const tieneFoto = !!profile?.foto_url;

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" />

      {/* Header con gradiente */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerCircle} />
        <View style={styles.profileRow}>
          {tieneFoto ? (
            <Image source={{ uri: profile!.foto_url! }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{nombreCorto.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hola, bienvenido 👋</Text>
            <Text style={styles.name}>{nombreCorto}</Text>
            <View style={styles.territoryRow}>
              <Ionicons name="location" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.territory}>{profile?.parroquia}, {profile?.canton}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner de foto pendiente */}
        {!tieneFoto && (
          <Pressable style={styles.banner} onPress={() => navigation.navigate('Perfil')}>
            <View style={styles.bannerIconWrap}>
              <Ionicons name="camera" size={18} color={colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerText}>Sube tu foto de perfil</Text>
              <Text style={styles.bannerSub}>La necesitas para reportar incidencias</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accentDark} />
          </Pressable>
        )}

        {/* Tarjetas resumen */}
        <View style={styles.grid}>
          <StatCard
            icono="clipboard"
            iconoBg={colors.primarySoft}
            iconoColor={colors.primary}
            valor={String(encuestasCount)}
            etiqueta="Encuestas pendientes"
          />
          <StatCard
            icono="calendar"
            iconoBg={colors.infoSoft}
            iconoColor={colors.info}
            valor={String(actividades.length)}
            etiqueta="Actividades cercanas"
          />
          <StatCard
            icono="megaphone"
            iconoBg={colors.accentSoft}
            iconoColor={colors.accentDark}
            valor={String(reportesCount)}
            etiqueta="Mis reportes"
          />
          <StatCard
            icono="map"
            iconoBg={colors.successSoft}
            iconoColor={colors.success}
            valor={profile?.parroquia || '—'}
            etiqueta="Mi territorio"
            valorPequeno
          />
        </View>

        {/* Actividades destacadas */}
        <Text style={styles.sectionTitle}>Actividades cerca de ti</Text>
        {actividades.length === 0 ? (
          <Text style={styles.emptyText}>Todavía no hay actividades registradas.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
            {actividades.map((a) => (
              <View key={a.id} style={styles.activityCard}>
                <View style={styles.activityDateBadge}>
                  <Ionicons name="calendar" size={12} color={colors.primary} />
                  <Text style={styles.activityDate}>{a.fecha}</Text>
                </View>
                <Text style={styles.activityTitle} numberOfLines={2}>{a.titulo}</Text>
                <Text style={styles.activityMeta} numberOfLines={1}>{a.organizacion}</Text>
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
            <View key={e.id} style={styles.surveyCard}>
              <View style={styles.surveyIconWrap}>
                <Ionicons name="clipboard" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.surveyTitle}>{e.titulo}</Text>
                <View style={styles.surveyMetaRow}>
                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.surveyMeta}>{e.tiempo_estimado}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// Tarjeta de estadística del resumen (ícono + número + etiqueta)
function StatCard({
  icono,
  iconoBg,
  iconoColor,
  valor,
  etiqueta,
  valorPequeno,
}: {
  icono: keyof typeof Ionicons.glyphMap;
  iconoBg: string;
  iconoColor: string;
  valor: string;
  etiqueta: string;
  valorPequeno?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: iconoBg }]}>
        <Ionicons name={icono} size={18} color={iconoColor} />
      </View>
      <Text style={valorPequeno ? styles.statValueSmall : styles.statValue} numberOfLines={1}>
        {valor}
      </Text>
      <Text style={styles.statLabel}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  headerCircle: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 24, fontWeight: '800' },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 1 },
  territoryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  territory: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 20,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { color: '#92400e', fontSize: 13.5, fontWeight: '700' },
  bannerSub: { color: '#b45309', fontSize: 11.5, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 26 },
  statCard: {
    width: '47.5%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  statValueSmall: { fontSize: 16, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11.5, color: colors.textSecondary, marginTop: 3 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 12 },
  emptyText: { fontSize: 13, color: colors.textMuted, marginBottom: 20 },

  hScroll: { marginBottom: 26, marginHorizontal: -20, paddingHorizontal: 20 },
  activityCard: {
    width: 180,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginRight: 12,
    ...shadow,
  },
  activityDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 10,
  },
  activityDate: { fontSize: 10.5, fontWeight: '700', color: colors.primary },
  activityTitle: { fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 19 },
  activityMeta: { fontSize: 11, color: colors.textMuted, marginTop: 6 },

  surveyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 10,
    ...shadow,
  },
  surveyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surveyTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  surveyMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  surveyMeta: { fontSize: 11.5, color: colors.textMuted },
});