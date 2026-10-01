import { View, Text, Image, Pressable, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, shadowStrong } from '../constants/theme';

type Props = NativeStackScreenProps<any>;

export default function SplashScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Círculos decorativos de fondo */}
      <View style={styles.circleTop} />
      <View style={styles.circleBottom} />

      <View style={styles.center}>
        <View style={styles.logoCard}>
          <Image
            source={require('../../assets/logo-icipaz.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>CIUDADANÍA</Text>
        <Text style={styles.titleAccent}>ICIPAZ</Text>
        <View style={styles.divider} />
        <Text style={styles.subtitle}>Índice de Ciudades de Paz</Text>
        <Text style={styles.tagline}>Tu voz construye un Cuenca más segura</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>Universidad Católica de Cuenca · UCACUE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  circleTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  center: {
    alignItems: 'center',
  },
  logoCard: {
    width: 132,
    height: 132,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    ...shadowStrong,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 3,
  },
  titleAccent: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: -4,
  },
  divider: {
    width: 44,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginVertical: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12.5,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actions: {
    width: '100%',
    marginTop: 52,
    gap: 14,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadowStrong,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});