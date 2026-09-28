import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

export default function SplashScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Image
          source={require('../../assets/logo-icipaz.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>CIUDADANÍA</Text>
        <Text style={styles.titleAccent}>ICIPAZ</Text>
        <Text style={styles.subtitle}>Índice de Ciudades de Paz</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.secondaryButtonText}>Registrarse</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>Universidad Católica de Cuenca · UCACUE</Text>
    </View>
  );
}

const AMBER = '#d97706';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  center: {
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 28,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  titleAccent: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: -2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 8,
  },
  actions: {
    width: '100%',
    marginTop: 56,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: AMBER,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
});
