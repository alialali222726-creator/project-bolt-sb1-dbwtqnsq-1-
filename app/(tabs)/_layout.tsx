import { Tabs } from 'expo-router';
import {
  Home,
  PlusCircle,
  Bell,
  Settings,
} from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TabLayout() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 68,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.common.home,
          tabBarIcon: ({ size, color }) => <Home size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: t.common.add,
          tabBarIcon: ({ size, color }) => <PlusCircle size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t.common.invitations,
          tabBarIcon: ({ size, color }) => <Bell size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.common.settings,
          tabBarIcon: ({ size, color }) => <Settings size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="adherence"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="cupping"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
