import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

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

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('SA');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+966');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [role, setRole] = useState<
    'doctor' | 'primary_caregiver' | 'backup_caregiver' | 'patient' | 'cupper'
  >('primary_caregiver');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !fullName || !phoneNumber) {
      Alert.alert(t.common.error, 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = phoneCountryCode + phoneNumber;
      await signUp(email, password, fullName, role, fullPhone);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectCountry = (country: Country) => {
    setCountryCode(country.code);
    setPhoneCountryCode(country.phone_code);
    setCountryModalVisible(false);
  };

  const isRTL = language === 'ar';
  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode);

  const roles = [
    { value: 'doctor', label: t.auth.doctor },
    { value: 'primary_caregiver', label: t.auth.primaryCaregiver },
    { value: 'backup_caregiver', label: t.auth.backupCaregiver },
    {
      value: 'patient',
      label: language === 'ar' ? 'مريض' : 'Patient',
    },
    { value: 'cupper', label: t.auth.cupper },
  ] as const;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, isRTL && styles.rtl]}>
          {t.auth.register}
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, isRTL && styles.rtl]}>
            {t.auth.fullName}
          </Text>
          <TextInput
            style={[styles.input, isRTL && styles.rtlInput]}
            value={fullName}
            onChangeText={setFullName}
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
              <Text style={styles.phoneCodeText}>{phoneCountryCode}</Text>
            </View>
            <TextInput
              style={[styles.phoneInput, isRTL && styles.rtlInput]}
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
              placeholder="501234567"
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          <Text style={[styles.label, isRTL && styles.rtl]}>{t.auth.email}</Text>
          <TextInput
            style={[styles.input, isRTL && styles.rtlInput]}
            value={email}
            onChangeText={setEmail}
            placeholder={t.auth.email}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign={isRTL ? 'right' : 'left'}
          />

          <Text style={[styles.label, isRTL && styles.rtl]}>
            {t.auth.password}
          </Text>
          <TextInput
            style={[styles.input, isRTL && styles.rtlInput]}
            value={password}
            onChangeText={setPassword}
            placeholder={t.auth.password}
            secureTextEntry
            textAlign={isRTL ? 'right' : 'left'}
          />

          <Text style={[styles.label, isRTL && styles.rtl]}>{t.auth.role}</Text>
          <View style={styles.roleContainer}>
            {roles.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.roleButton,
                  role === r.value && styles.roleButtonActive,
                ]}
                onPress={() => setRole(r.value)}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === r.value && styles.roleTextActive,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '...' : t.auth.register}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.switchText, isRTL && styles.rtl]}>
              {t.auth.alreadyHaveAccount}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                  <Text style={styles.countryCodeText}>{country.phone_code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4ECFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 32,
  },
  rtl: {
    textAlign: 'right',
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  input: {
    backgroundColor: '#F9F5FF',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  rtlInput: {
    textAlign: 'right',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F5FF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  countryText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneCode: {
    backgroundColor: '#F9F5FF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
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
    backgroundColor: '#F9F5FF',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  roleContainer: {
    gap: 12,
  },
  roleButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#EDE9FE',
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  roleTextActive: {
    color: '#8B5CF6',
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    color: '#8B5CF6',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
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
    maxHeight: '70%',
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
  countryCodeText: {
    fontSize: 14,
    color: '#666666',
  },
});
