import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';

interface Country {
  code: string;
  name_ar: string;
  name_en: string;
  phone_code: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
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

interface PhoneInputProps {
  value: string;
  countryCode: string;
  phoneCountryCode: string;
  onChangePhone: (phone: string) => void;
  onChangeCountry: (country: Country) => void;
  language: 'ar' | 'en';
  placeholder?: string;
  isRTL?: boolean;
  label?: string;
  showCountrySelector?: boolean;
}

export default function PhoneInput({
  value,
  countryCode,
  phoneCountryCode,
  onChangePhone,
  onChangeCountry,
  language,
  placeholder = '501234567',
  isRTL = false,
  label,
  showCountrySelector = true,
}: PhoneInputProps) {
  const [countryModalVisible, setCountryModalVisible] = useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode);

  const selectCountry = (country: Country) => {
    onChangeCountry(country);
    setCountryModalVisible(false);
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    onChangePhone(cleaned);
  };

  return (
    <View>
      {showCountrySelector && label && (
        <Text style={[styles.label, isRTL && styles.rtl]}>
          {language === 'ar' ? 'الدولة' : 'Country'}
        </Text>
      )}

      {showCountrySelector && (
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => setCountryModalVisible(true)}
        >
          <Text style={styles.countryText}>
            {selectedCountry?.flag} {language === 'ar' ? selectedCountry?.name_ar : selectedCountry?.name_en}
          </Text>
          <ChevronDown size={20} color="#666666" />
        </TouchableOpacity>
      )}

      {label && (
        <Text style={[styles.label, isRTL && styles.rtl, showCountrySelector && { marginTop: 0 }]}>
          {label}
        </Text>
      )}

      <View style={styles.phoneInputContainer}>
        <View style={styles.phoneCode}>
          <Text style={styles.phoneCodeText}>{phoneCountryCode}</Text>
        </View>
        <TextInput
          style={[styles.phoneInput, isRTL && styles.rtlInput]}
          value={value}
          onChangeText={handlePhoneChange}
          placeholder={placeholder}
          keyboardType="phone-pad"
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  rtl: {
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
    fontWeight: '600',
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
  rtlInput: {
    textAlign: 'right',
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
    maxHeight: '70%',
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
    fontWeight: '600',
  },
});
