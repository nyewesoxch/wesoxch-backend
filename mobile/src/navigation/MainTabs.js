import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const COCOA = '#7B4F2E';

const makeScreen = (name, icon) => () => (
  <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{name}</Text>
    <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8 }}>Coming next!</Text>
  </View>
);

const PulseScreen = makeScreen('Pulse Feed', '🌍');
const CommunitiesScreen = makeScreen('Communities', '👥');
const SearchScreen = makeScreen('Search', '🔍');
const EventsScreen = makeScreen('Events', '📅');
const ProfileScreen = makeScreen('Profile', '👤');

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1E293B', borderTopColor: '#334155', paddingBottom: 6, paddingTop: 6, height: 60 },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = { Pulse: focused ? 'radio' : 'radio-outline', Communities: focused ? 'people' : 'people-outline', Search: focused ? 'search' : 'search-outline', Events: focused ? 'calendar' : 'calendar-outline', Profile: focused ? 'person' : 'person-outline' };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Pulse" component={PulseScreen} />
      <Tab.Screen name="Communities" component={CommunitiesScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
