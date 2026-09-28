import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

const TEAL = '#0f766e';

export default function PrivacyPolicyScreen({ navigation }: Props) {
  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Privacidad y datos personales</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Aviso de Tratamiento de Datos Personales</Text>
        <Text style={styles.p}>
          Ciudadanía ICIPAZ, en el marco del proyecto de investigación "Índice de Ciudades
          de Paz" de la Universidad Católica de Cuenca (UCACUE), recolecta y trata los
          siguientes datos personales:
        </Text>

        <Text style={styles.bullet}>• Nombre completo y correo electrónico.</Text>
        <Text style={styles.bullet}>• Territorio (provincia, cantón y parroquia).</Text>
        <Text style={styles.bullet}>• Fotografía de perfil (cuando la proporcionas).</Text>
        <Text style={styles.bullet}>• Ubicación geográfica, únicamente al reportar una incidencia o responder una encuesta que la requiera.</Text>
        <Text style={styles.bullet}>• Tus respuestas a encuestas y reportes de incidencias.</Text>

        <Text style={styles.h2}>¿Para qué usamos tus datos?</Text>
        <Text style={styles.bullet}>• Permitir tu participación en encuestas y actividades comunitarias.</Text>
        <Text style={styles.bullet}>• Verificar la autenticidad de cuentas y reportes, para preservar la integridad de los indicadores del Índice de Ciudades de Paz.</Text>
        <Text style={styles.bullet}>• Medir y calcular indicadores agregados y anónimos de gobernanza, seguridad y participación ciudadana en tu territorio.</Text>

        <Text style={styles.h2}>¿Con quién se comparten?</Text>
        <Text style={styles.p}>
          Tus datos no se usan con fines comerciales ni se comparten con terceros sin tu
          consentimiento, salvo requerimiento legal. Los resultados públicos del Índice se
          presentan de forma agregada y no identificable — nunca se publica tu nombre o
          información personal junto a un indicador.
        </Text>

        <Text style={styles.h2}>Tus derechos</Text>
        <Text style={styles.p}>
          De acuerdo con la Ley Orgánica de Protección de Datos Personales (LOPDP) del
          Ecuador, tienes derecho a acceder, rectificar, actualizar, eliminar u oponerte
          al tratamiento de tus datos personales en cualquier momento.
        </Text>

        <Text style={styles.h2}>Consentimiento</Text>
        <Text style={styles.p}>
          Al crear tu cuenta y marcar la casilla de aceptación, otorgas tu consentimiento
          libre, específico e informado para el tratamiento de tus datos conforme a lo aquí
          descrito.
        </Text>

        <Text style={styles.footer}>Última actualización: septiembre 2026</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { marginBottom: 10 },
  backText: { color: TEAL, fontSize: 14, fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 40 },
  h1: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  h2: { fontSize: 14, fontWeight: '700', color: TEAL, marginTop: 18, marginBottom: 6 },
  p: { fontSize: 13, color: '#4b5563', lineHeight: 20, marginBottom: 4 },
  bullet: { fontSize: 13, color: '#4b5563', lineHeight: 20, marginBottom: 4, marginLeft: 4 },
  footer: { fontSize: 11, color: '#9ca3af', marginTop: 28, textAlign: 'center' },
});
