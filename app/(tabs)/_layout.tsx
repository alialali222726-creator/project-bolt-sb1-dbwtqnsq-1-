import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import {
  Home,
  Bell,
  Settings,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { responsive } from '@/lib/responsive';

export default function TabLayout() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const isRTL = language === 'ar';

  const tabBarHeight = responsive.tabBarHeight + (Platform.OS === 'ios' ? insets.bottom : 8);
  const iconSize = responsive.iconSize(24);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: responsive.isSmallScreen ? 4 : 8,
        },
        tabBarLabelStyle: {
          fontSize: responsive.fontSize(12),
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: responsive.isSmallScreen ? 2 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.common.home,
          tabBarIcon: ({ size, color }) => <Home size={iconSize} color={color} />,
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
          href: null,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t.common.invitations,
          tabBarIcon: ({ size, color }) => <Bell size={iconSize} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.common.settings,
          tabBarIcon: ({ size, color }) => <Settings size={iconSize} color={color} />,
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
        name="cupping"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
