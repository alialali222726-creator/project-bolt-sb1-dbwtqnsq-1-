import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Globe, LogOut, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  const isRTL = language === 'ar';

  const handleLogout = async () => {
    Alert.alert(
      t.auth.logout,
      language === 'ar'
        ? 'هل أنت متأكد من تسجيل الخروج؟'
        : 'Are you sure you want to logout?',
      [
        {
          text: t.patients.cancel,
          style: 'cancel',
        },
        {
          text: t.auth.logout,
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error: any) {
              Alert.alert(t.common.error, error.message);
            }
          },
        },
      ]
    );
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'doctor':
        return t.auth.doctor;
      case 'primary_caregiver':
        return t.auth.primaryCaregiver;
      case 'backup_caregiver':
        return t.auth.backupCaregiver;
      default:
        return role;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, isRTL && styles.rtl]}>
          {language === 'ar' ? 'الإعدادات' : 'Settings'}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.profileIcon}>
            <User size={40} color="#007AFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, isRTL && styles.rtl]}>
              {profile?.full_name}
            </Text>
            <Text style={[styles.profileRole, isRTL && styles.rtl]}>
              {getRoleLabel(profile?.role || '')}
            </Text>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {language === 'ar' ? 'التفضيلات' : 'Preferences'}
          </Text>

          <TouchableOpacity style={styles.settingItem} onPress={toggleLanguage}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIcon}>
                <Globe size={24} color="#007AFF" />
              </View>
              <View>
                <Text style={[styles.settingLabel, isRTL && styles.rtl]}>
                  {language === 'ar' ? 'اللغة' : 'Language'}
                </Text>
                <Text style={[styles.settingValue, isRTL && styles.rtl]}>
                  {language === 'ar' ? 'العربية' : 'English'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {language === 'ar' ? 'الحساب' : 'Account'}
          </Text>

          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, styles.logoutIcon]}>
                <LogOut size={24} color="#FF3B30" />
              </View>
              <Text style={[styles.settingLabel, styles.logoutText]}>
                {t.auth.logout}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, isRTL && styles.rtl]}>
            {language === 'ar'
              ? 'تطبيق إدارة العلاج الدوائي'
              : 'Medication Management App'}
          </Text>
          <Text style={[styles.footerVersion, isRTL && styles.rtl]}>
            Version 1.0.0
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rtl: {
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: '#666666',
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoutIcon: {
    backgroundColor: '#FFE5E5',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    color: '#666666',
  },
  logoutText: {
    color: '#FF3B30',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: '#999999',
  },
});
