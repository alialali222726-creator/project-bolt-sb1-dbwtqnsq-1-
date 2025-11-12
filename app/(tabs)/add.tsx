import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Pill,
  Users,
  UserPlus,
  Heart,
  AlertCircle,
  Stethoscope,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PhoneInput, { COUNTRIES } from '@/components/PhoneInput';
import { responsive } from '@/lib/responsive';

interface AddOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  action: () => void;
}

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState(profile?.country_code || 'SA');
  const [phoneCountryCode, setPhoneCountryCode] = useState(profile?.phone_country_code || '+966');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const isRTL = language === 'ar';
  const userRole = profile?.role;

  const getDoctorOptions = (): AddOption[] => [
    {
      id: 'personal_med',
      title: t.add.personalMed,
      description: t.add.personalMedDesc,
      icon: Pill,
      color: '#34C759',
      bgColor: '#E8F5E9',
      action: () => router.push('/(tabs)/medications'),
    },
    {
      id: 'companion',
      title: t.add.companion,
      description: t.add.companionDesc,
      icon: UserPlus,
      color: '#FF9500',
      bgColor: '#FFF3E0',
      action: () => openInviteModal('primary_caregiver'),
    },
    {
      id: 'patient',
      title: t.add.patient,
      description: t.add.patientDesc,
      icon: Users,
      color: '#007AFF',
      bgColor: '#E3F2FD',
      action: () => openInviteModal('patient'),
    },
  ];

  const getPatientOptions = (): AddOption[] => [
    {
      id: 'personal_med',
      title: t.add.personalMed,
      description: t.add.personalMedDesc,
      icon: Pill,
      color: '#34C759',
      bgColor: '#E8F5E9',
      action: () => router.push('/(tabs)/medications'),
    },
    {
      id: 'companion',
      title: t.add.companion,
      description: t.add.companionDesc,
      icon: UserPlus,
      color: '#FF9500',
      bgColor: '#FFF3E0',
      action: () => openInviteModal('primary_caregiver'),
    },
    {
      id: 'doctor',
      title: t.add.doctor,
      description: t.add.doctorDesc,
      icon: Stethoscope,
      color: '#5856D6',
      bgColor: '#EDE7F6',
      action: () => openInviteModal('doctor'),
    },
    {
      id: 'chronic_condition',
      title: t.add.chronicCondition,
      description: t.add.chronicConditionDesc,
      icon: Heart,
      color: '#FF3B30',
      bgColor: '#FFEBEE',
      action: () => {},
    },
    {
      id: 'drug_allergy',
      title: t.add.drugAllergy,
      description: t.add.drugAllergyDesc,
      icon: AlertCircle,
      color: '#FF9500',
      bgColor: '#FFF3E0',
      action: () => {},
    },
  ];

  const getCupperOptions = (): AddOption[] => [
    {
      id: 'personal_med',
      title: t.add.personalMed,
      description: t.add.personalMedDesc,
      icon: Pill,
      color: '#34C759',
      bgColor: '#E8F5E9',
      action: () => router.push('/(tabs)/medications'),
    },
    {
      id: 'doctor',
      title: t.add.doctor,
      description: t.add.doctorDesc,
      icon: Stethoscope,
      color: '#5856D6',
      bgColor: '#EDE7F6',
      action: () => openInviteModal('cupper_to_doctor'),
    },
    {
      id: 'getting_cupped',
      title: t.add.gettingCupped,
      description: t.add.gettingCuppedDesc,
      icon: Users,
      color: '#007AFF',
      bgColor: '#E3F2FD',
      action: () => openInviteModal('patient_getting_cupping'),
    },
  ];

  const getOptions = (): AddOption[] => {
    switch (userRole) {
      case 'doctor':
        return getDoctorOptions();
      case 'patient':
        return getPatientOptions();
      case 'cupper':
        return getCupperOptions();
      case 'primary_caregiver':
      case 'backup_caregiver':
        return getPatientOptions();
      default:
        return [];
    }
  };

  const openInviteModal = (role: string) => {
    setSelectedRole(role);
    setInviteModalVisible(true);
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, { ar: string; en: string }> = {
      primary_caregiver: {
        ar: 'مرافق رئيسي - يمكنه إدارة الأدوية والمتابعة الكاملة',
        en: 'Primary Caregiver - Can manage medications and full monitoring',
      },
      backup_caregiver: {
        ar: 'مرافق احتياطي - يمكنه المساعدة في تسجيل الجرعات',
        en: 'Backup Caregiver - Can help log doses',
      },
      doctor: {
        ar: 'طبيب - يمكنه إضافة وتعديل الأدوية ومراقبة الالتزام',
        en: 'Doctor - Can add/edit medications and monitor adherence',
      },
      patient: {
        ar: 'مريض - الشخص الذي سيتم متابعة أدويته',
        en: 'Patient - Person whose medications will be tracked',
      },
      cupper: {
        ar: 'حجام - يمكنه مشاهدة الأمراض وإرسال طلبات إيقاف الأدوية',
        en: 'Cupper - Can view conditions and send medication pause requests',
      },
      patient_getting_cupping: {
        ar: 'متحجّم - شخص يريد الحجامة',
        en: 'Getting Cupping - Person who wants cupping',
      },
      cupper_to_doctor: {
        ar: 'ربط مع طبيب - للتنسيق حول إيقاف الأدوية',
        en: 'Link with Doctor - To coordinate medication pauses',
      },
    };

    return descriptions[role]?.[language === 'ar' ? 'ar' : 'en'] || '';
  };

  const handleSendInvitation = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert(
        t.common.error,
        language === 'ar' ? 'الرجاء إدخال رقم الهاتف' : 'Please enter phone number'
      );
      return;
    }

    try {
      let patientId = null;
      const fullPhoneNumber = phoneCountryCode + phoneNumber;

      if (selectedRole === 'patient' || selectedRole === 'patient_getting_cupping') {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('phone_number', fullPhoneNumber)
          .maybeSingle();

        if (!existingProfile) {
          Alert.alert(
            t.common.error,
            language === 'ar'
              ? 'لم يتم العثور على مستخدم بهذا الرقم'
              : 'No user found with this phone number'
          );
          return;
        }

        const { data: theirPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('created_by', existingProfile.id)
          .maybeSingle();

        if (theirPatient) {
          patientId = theirPatient.id;
        }
      } else {
        const { data: myPatient } = await supabase
          .from('patients')
          .select('id')
          .eq('created_by', profile?.id)
          .maybeSingle();

        if (myPatient) {
          patientId = myPatient.id;
        }
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from('invitations').insert({
        inviter_id: profile?.id,
        patient_id: patientId,
        phone_number: fullPhoneNumber,
        role: selectedRole === 'cupper_to_doctor' ? 'cupper' : selectedRole,
        role_description: getRoleDescription(selectedRole),
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      Alert.alert(
        t.common.success,
        language === 'ar'
          ? 'تم إرسال الدعوة بنجاح. سيتلقى المستخدم إشعاراً في التطبيق'
          : 'Invitation sent successfully. User will receive an in-app notification'
      );
      setInviteModalVisible(false);
      setPhoneNumber('');
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const options = getOptions();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + responsive.padding }]}>
        <Text style={[styles.title, isRTL && styles.rtl]}>{t.add.title}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: responsive.tabBarHeight + 20 }]}
      >
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <View
                style={[styles.iconContainer, { backgroundColor: option.bgColor }]}
              >
                <Icon size={32} color={option.color} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, isRTL && styles.rtl]}>
                  {option.title}
                </Text>
                <Text style={[styles.optionDescription, isRTL && styles.rtl]}>
                  {option.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: responsive.modalMaxHeight }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
                {language === 'ar' ? 'إضافة عبر رقم الهاتف' : 'Add via Phone Number'}
              </Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <PhoneInput
              value={phoneNumber}
              countryCode={countryCode}
              phoneCountryCode={phoneCountryCode}
              onChangePhone={setPhoneNumber}
              onChangeCountry={(country) => {
                setCountryCode(country.code);
                setPhoneCountryCode(country.phone_code);
              }}
              language={language}
              isRTL={isRTL}
              label={t.common.phoneNumber}
              showCountrySelector={true}
            />

            <Text style={[styles.roleDescription, isRTL && styles.rtl]}>
              {getRoleDescription(selectedRole)}
            </Text>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSendInvitation}
            >
              <Text style={styles.submitButtonText}>{t.common.send}</Text>
            </TouchableOpacity>
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
    paddingHorizontal: responsive.padding,
    paddingBottom: 24,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rtl: {
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: responsive.padding,
    gap: responsive.isSmallScreen ? 12 : 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: responsive.cardPadding,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    minHeight: 100,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
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
    minHeight: 350,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9F5FF',
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  rtlInput: {
    textAlign: 'right',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666666',
    backgroundColor: '#F9F5FF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
