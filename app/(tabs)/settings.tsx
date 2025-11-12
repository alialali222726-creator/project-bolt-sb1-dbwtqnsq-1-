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
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Globe, LogOut, User, Edit, Calendar, Camera, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

interface Country {
  code: string;
  name_ar: string;
  name_en: string;
  phone_code: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'SA', name_ar: 'السعودية', name_en: 'Saudi Arabia', phone_code: '+966', flag: '🇸🇦' },
  { code: 'AE', name_ar: 'الإمارات', name_en: 'UAE', phone_code: '+971', flag: '🇦🇪' },
  { code: 'KW', name_ar: 'الكويت', name_en: 'Kuwait', phone_code: '+965', flag: '🇰🇼' },
  { code: 'BH', name_ar: 'البحرين', name_en: 'Bahrain', phone_code: '+973', flag: '🇧🇭' },
  { code: 'QA', name_ar: 'قطر', name_en: 'Qatar', phone_code: '+974', flag: '🇶🇦' },
  { code: 'OM', name_ar: 'عمان', name_en: 'Oman', phone_code: '+968', flag: '🇴🇲' },
  { code: 'JO', name_ar: 'الأردن', name_en: 'Jordan', phone_code: '+962', flag: '🇯🇴' },
  { code: 'EG', name_ar: 'مصر', name_en: 'Egypt', phone_code: '+20', flag: '🇪🇬' },
  { code: 'US', name_ar: 'أمريكا', name_en: 'United States', phone_code: '+1', flag: '🇺🇸' },
  { code: 'GB', name_ar: 'بريطانيا', name_en: 'United Kingdom', phone_code: '+44', flag: '🇬🇧' },
];

export default function SettingsScreen() {
  const { profile, signOut, updateProfile } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    date_of_birth: profile?.date_of_birth || '',
    gender: profile?.gender || '',
    country_code: profile?.country_code || 'SA',
    phone_country_code: profile?.phone_country_code || '+966',
    phone_number: profile?.phone_number || '',
    avatar_url: profile?.avatar_url || '',
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        country_code: profile.country_code || 'SA',
        phone_country_code: profile.phone_country_code || '+966',
        phone_number: profile.phone_number || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

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
              setTimeout(() => {
                router.replace('/(auth)/login');
              }, 100);
            } catch (error: any) {
              console.error('Logout error:', error);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t.common.error,
        language === 'ar'
          ? 'نحتاج إلى إذن الوصول للصور'
          : 'We need camera roll permissions'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      setFormData({ ...formData, avatar_url: urlData.publicUrl });

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', profile?.id);

      Alert.alert(
        t.common.success,
        language === 'ar'
          ? 'تم تحديث الصورة الشخصية'
          : 'Profile picture updated'
      );
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          country_code: formData.country_code,
          phone_country_code: formData.phone_country_code,
          phone_number: formData.phone_number,
        })
        .eq('id', profile?.id);

      if (error) throw error;

      Alert.alert(
        t.common.success,
        language === 'ar'
          ? 'تم تحديث الملف الشخصي'
          : 'Profile updated successfully'
      );
      setModalVisible(false);

      if (updateProfile) {
        await updateProfile({
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth || undefined,
          gender: formData.gender as 'male' | 'female' | undefined,
          country_code: formData.country_code,
          phone_country_code: formData.phone_country_code,
          phone_number: formData.phone_number,
        });
      }
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const selectCountry = (country: Country) => {
    setFormData({
      ...formData,
      country_code: country.code,
      phone_country_code: country.phone_code,
    });
    setCountryModalVisible(false);
  };

  const selectedCountry = COUNTRIES.find((c) => c.code === formData.country_code);
  const age = profile?.date_of_birth ? calculateAge(profile.date_of_birth) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, isRTL && styles.rtl]}>
          {t.common.settings}
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {uploading ? (
              <View style={styles.avatar}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : formData.avatar_url ? (
              <Image source={{ uri: formData.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={48} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Camera size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.userName, isRTL && styles.rtl]}>
            {profile?.full_name}
          </Text>
          {age && (
            <Text style={styles.userAge}>
              {language === 'ar' ? `${age} سنة` : `${age} years old`}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setModalVisible(true)}
          >
            <View style={[styles.settingLeft, isRTL && styles.settingLeftRTL]}>
              <View style={styles.iconContainer}>
                <Edit size={20} color="#8B5CF6" />
              </View>
              <Text style={[styles.settingText, isRTL && styles.rtl]}>
                {language === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={toggleLanguage}>
            <View style={[styles.settingLeft, isRTL && styles.settingLeftRTL]}>
              <View style={styles.iconContainer}>
                <Globe size={20} color="#8B5CF6" />
              </View>
              <Text style={[styles.settingText, isRTL && styles.rtl]}>
                {language === 'ar' ? 'اللغة' : 'Language'}
              </Text>
            </View>
            <Text style={styles.settingValue}>
              {language === 'ar' ? 'العربية' : 'English'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>{t.auth.logout}</Text>
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
            <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
              {language === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}
            </Text>

            <ScrollView>
              <Text style={[styles.label, isRTL && styles.rtl]}>
                {t.auth.fullName}
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.rtlInput]}
                value={formData.full_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, full_name: text })
                }
                placeholder={t.auth.fullName}
                textAlign={isRTL ? 'right' : 'left'}
              />

              <Text style={[styles.label, isRTL && styles.rtl]}>
                {language === 'ar' ? 'الدولة' : 'Country'}
              </Text>
              <TouchableOpacity
                style={styles.countrySelector}
                onPress={() => setCountryModalVisible(true)}
              >
                <Text style={styles.countryText}>
                  {selectedCountry?.flag} {language === 'ar' ? selectedCountry?.name_ar : selectedCountry?.name_en}
                </Text>
                <ChevronDown size={20} color="#666666" />
              </TouchableOpacity>

              <Text style={[styles.label, isRTL && styles.rtl]}>
                {t.common.phoneNumber}
              </Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.phoneCode}>
                  <Text style={styles.phoneCodeText}>
                    {formData.phone_country_code}
                  </Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, isRTL && styles.rtlInput]}
                  value={formData.phone_number?.replace(formData.phone_country_code, '')}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      phone_number: formData.phone_country_code + text.replace(/[^0-9]/g, ''),
                    })
                  }
                  placeholder="501234567"
                  keyboardType="phone-pad"
                  textAlign={isRTL ? 'right' : 'left'}
                />
              </View>

              <Text style={[styles.label, isRTL && styles.rtl]}>
                {language === 'ar' ? 'تاريخ الميلاد' : 'Date of Birth'}
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
                {language === 'ar' ? 'الجنس' : 'Gender'}
              </Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    formData.gender === 'male' && styles.genderButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, gender: 'male' })}
                >
                  <Text
                    style={[
                      styles.genderText,
                      formData.gender === 'male' && styles.genderTextActive,
                    ]}
                  >
                    {language === 'ar' ? 'ذكر' : 'Male'}
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
                      styles.genderText,
                      formData.gender === 'female' && styles.genderTextActive,
                    ]}
                  >
                    {language === 'ar' ? 'أنثى' : 'Female'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>{t.patients.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateProfile}
                >
                  <Text style={styles.saveButtonText}>
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={countryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
              {language === 'ar' ? 'اختر الدولة' : 'Select Country'}
            </Text>

            <ScrollView>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={styles.countryItem}
                  onPress={() => selectCountry(country)}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={[styles.countryName, isRTL && styles.rtl]}>
                    {language === 'ar' ? country.name_ar : country.name_en}
                  </Text>
                  <Text style={styles.countryCode}>{country.phone_code}</Text>
                </TouchableOpacity>
              ))}
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
    backgroundColor: '#F4ECFF',
  },
  header: {
    backgroundColor: 'transparent',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rtl: {
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E5E5E5',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userAge: {
    fontSize: 16,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    marginHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLeftRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  settingValue: {
    fontSize: 16,
    color: '#666666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '85%',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
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
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  countryText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  phoneCode: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    minWidth: 80,
  },
  phoneCodeText: {
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#EDE9FE',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  genderTextActive: {
    color: '#8B5CF6',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  countryCode: {
    fontSize: 14,
    color: '#666666',
  },
});
