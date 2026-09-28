import { View, Text, StyleSheet } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Perfil</Text>
      <Text style={styles.sub}>Próximo paso: contenido real</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingTop: 40 },
  text: { fontSize: 18, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 13, color: '#9ca3af', marginTop: 6 },
});
