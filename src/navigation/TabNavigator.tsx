import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import SurveysScreen from '../screens/SurveysScreen';
import ActivitiesScreen from '../screens/ActivitiesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TEAL = '#0f766e';

// Ícono de cada tab: relleno cuando está activa, contorno cuando no
const TAB_ICONS: Record<string, { activo: keyof typeof Ionicons.glyphMap; inactivo: keyof typeof Ionicons.glyphMap }> = {
  Inicio: { activo: 'home', inactivo: 'home-outline' },
  Encuestas: { activo: 'clipboard', inactivo: 'clipboard-outline' },
  Actividades: { activo: 'calendar', inactivo: 'calendar-outline' },
  Perfil: { activo: 'person', inactivo: 'person-outline' },
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: TEAL,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarStyle: { borderTopColor: '#f3f4f6' },
        tabBarIcon: ({ focused, color, size }) => {
          const icono = TAB_ICONS[route.name];
          const nombre = focused ? icono.activo : icono.inactivo;
          return <Ionicons name={nombre} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Encuestas" component={SurveysScreen} />
      <Tab.Screen name="Actividades" component={ActivitiesScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}