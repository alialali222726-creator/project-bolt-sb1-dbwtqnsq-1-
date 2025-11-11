import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Globe, LogOut, User, Edit, Calendar } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
  });

  const isRTL = language === 'ar';

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

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

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
        })
        .eq('id', profile?.id);

      if (error) throw error;

      Alert.alert(
        t.common.success,
        language === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile updated successfully',
        [
          {
            text: t.common.confirm,
            onPress: () => {
              setModalVisible(false);
              router.replace('/(tabs)/settings');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const age = profile?.date_of_birth ? calculateAge(profile.date_of_birth) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, isRTL && styles.rtl]}>
          {t.common.settings}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.profileIcon}>
            <User size={48} color="#007AFF" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, isRTL && styles.rtl]}>
              {profile?.full_name}
            </Text>
            {age && (
              <Text style={[styles.profileDetail, isRTL && styles.rtl]}>
                {age} {t.common.years}
              </Text>
            )}
            {profile?.gender && (
              <Text style={[styles.profileDetail, isRTL && styles.rtl]}>
                {profile.gender === 'male' ? t.common.male : t.common.female}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setFormData({
                full_name: profile?.full_name || '',
                date_of_birth: profile?.date_of_birth || '',
                gender: profile?.gender || '',
              });
              setModalVisible(true);
            }}
          >
            <Edit size={20} color="#007AFF" />
          </TouchableOpacity>
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
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
                {language === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={[styles.label, isRTL && styles.rtl]}>
                {language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={formData.full_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, full_name: text })
                }
                placeholder={language === 'ar' ? 'الاسم الكامل' : 'Full Name'}
                textAlign={isRTL ? 'right' : 'left'}
              />

              <Text style={[styles.label, isRTL && styles.rtl]}>
                {t.common.dateOfBirth}
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={formData.date_of_birth}
                onChangeText={(text) =>
                  setFormData({ ...formData, date_of_birth: text })
                }
                placeholder="YYYY-MM-DD"
                textAlign={isRTL ? 'right' : 'left'}
              />

              <Text style={[styles.label, isRTL && styles.rtl]}>
                {t.common.gender}
              </Text>
              <View style={styles.genderButtons}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    formData.gender === 'male' && styles.genderButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: 'male' })}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      formData.gender === 'male' && styles.genderButtonTextActive,
                    ]}
                  >
                    {t.common.male}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    formData.gender === 'female' && styles.genderButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: 'female' })}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      formData.gender === 'female' && styles.genderButtonTextActive,
                    ]}
                  >
                    {t.common.female}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.submitButtonText}>{t.patients.save}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalClose: {
    fontSize: 24,
    color: '#666666',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  rtlInput: {
    textAlign: 'right',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  genderButtonTextActive: {
    color: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
