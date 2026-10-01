// Sistema de diseño central de Ciudadanía ICIPAZ
// Todos los colores, sombras y tamaños salen de aquí para que la app
// se vea consistente en todas las pantallas.

export const colors = {
  // Marca ICIPAZ
  primary: '#0f766e',        // teal principal
  primaryDark: '#134e4a',    // teal profundo (gradientes)
  primarySoft: '#ccfbf1',    // teal muy suave (fondos de pills)
  accent: '#d97706',         // ámbar (acciones principales)
  accentDark: '#b45309',
  accentSoft: '#fef3c7',     // ámbar suave (fondos)

  // Base cálida
  background: '#faf8f5',     // blanco hueso cálido (fondo general)
  card: '#ffffff',
  border: '#f0ece6',

  // Texto
  text: '#1c1917',           // casi negro cálido
  textSecondary: '#57534e',
  textMuted: '#a8a29e',

  // Estados
  success: '#047857',
  successSoft: '#d1fae5',
  error: '#dc2626',
  errorSoft: '#fee2e2',
  info: '#1e40af',
  infoSoft: '#dbeafe',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  full: 999,
};

// Sombra suave estilo "premium" (funciona en iOS y Android)
export const shadow = {
  shadowColor: '#134e4a',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
};

export const shadowStrong = {
  shadowColor: '#134e4a',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.14,
  shadowRadius: 24,
  elevation: 8,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};