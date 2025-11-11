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
  QrCode,
  Heart,
  AlertCircle,
  Stethoscope,
  X,
} from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import QRScanner from '@/components/QRScanner';

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
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
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
      action: () => setQrScannerVisible(true),
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
      action: () => setQrScannerVisible(true),
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
      action: () => setQrScannerVisible(true),
    },
    {
      id: 'getting_cupped',
      title: t.add.gettingCupped,
      description: t.add.gettingCuppedDesc,
      icon: Users,
      color: '#007AFF',
      bgColor: '#E3F2FD',
      action: () => setQrScannerVisible(true),
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

  const handleSendInvitation = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert(t.common.error, 'Please enter phone number');
      return;
    }

    try {
      const { data: patientData } = await supabase
        .from('patients')
        .select('id')
        .eq('created_by', profile?.id)
        .maybeSingle();

      if (!patientData) {
        Alert.alert(t.common.error, 'Patient not found');
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const roleDesc =
        selectedRole === 'primary_caregiver'
          ? language === 'ar'
            ? 'مرافق رئيسي - يمكنه إدارة الأدوية والمتابعة الكاملة'
            : 'Primary Caregiver - Can manage medications and full monitoring'
          : language === 'ar'
          ? 'مرافق احتياطي - يمكنه المساعدة في تسجيل الجرعات'
          : 'Backup Caregiver - Can help log doses';

      const { error } = await supabase.from('invitations').insert({
        inviter_id: profile?.id,
        patient_id: patientData.id,
        phone_number: phoneNumber,
        role: selectedRole,
        role_description: roleDesc,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      Alert.alert(
        t.common.success,
        language === 'ar'
          ? 'تم إرسال الدعوة بنجاح'
          : 'Invitation sent successfully'
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
      <View style={styles.header}>
        <Text style={[styles.title, isRTL && styles.rtl]}>{t.add.title}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
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

      {qrScannerVisible && (
        <Modal visible={true} animationType="slide">
          <QRScanner
            onClose={() => setQrScannerVisible(false)}
            onSuccess={() => {
              setQrScannerVisible(false);
              router.push('/(tabs)/home');
            }}
          />
        </Modal>
      )}

      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInviteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
                {t.common.invite} {t.add.companion}
              </Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, isRTL && styles.rtl]}>
              {t.common.phoneNumber}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+966501234567"
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.roleDescription, isRTL && styles.rtl]}>
              {selectedRole === 'primary_caregiver'
                ? language === 'ar'
                  ? 'المرافق الرئيسي يمكنه إدارة الأدوية والمتابعة الكاملة'
                  : 'Primary caregiver can manage medications and full monitoring'
                : language === 'ar'
                ? 'المرافق الاحتياطي يمكنه المساعدة في تسجيل الجرعات'
                : 'Backup caregiver can help log doses'}
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    padding: 20,
    gap: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 300,
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
  roleDescription: {
    fontSize: 14,
    color: '#666666',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
