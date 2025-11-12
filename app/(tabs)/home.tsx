import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  User,
  Heart,
  AlertCircle,
  Stethoscope,
  Pill,
  Plus,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { responsive } from '@/lib/responsive';

interface ChronicCondition {
  id: string;
  condition_name: string;
}

interface MedicationAllergy {
  id: string;
  medication_name: string;
  severity: 'mild' | 'moderate' | 'severe';
}

interface Doctor {
  full_name: string;
  specialization: {
    name_ar: string;
    name_en: string;
  } | null;
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [conditions, setConditions] = useState<ChronicCondition[]>([]);
  const [allergies, setAllergies] = useState<MedicationAllergy[]>([]);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [medicationCount, setMedicationCount] = useState(0);

  const isRTL = language === 'ar';

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);

      const { data: patientData } = await supabase
        .from('patients')
        .select('id')
        .eq('created_by', profile?.id)
        .maybeSingle();

      if (patientData) {
        await Promise.all([
          loadConditions(patientData.id),
          loadAllergies(patientData.id),
          loadDoctor(patientData.id),
          loadMedicationCount(patientData.id),
        ]);
      }
    } catch (error: any) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConditions = async (patientId: string) => {
    const { data } = await supabase
      .from('chronic_conditions')
      .select('id, condition_name')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(3);

    setConditions(data || []);
  };

  const loadAllergies = async (patientId: string) => {
    const { data } = await supabase
      .from('medication_allergies')
      .select('id, medication_name, severity')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(3);

    setAllergies(data || []);
  };

  const loadDoctor = async (patientId: string) => {
    const { data: teamData } = await supabase
      .from('patient_team')
      .select('user_id')
      .eq('patient_id', patientId)
      .eq('role', 'doctor')
      .maybeSingle();

    if (teamData) {
      const { data: doctorData } = await supabase
        .from('profiles')
        .select(
          `
          full_name,
          specialization:doctor_specializations(name_ar, name_en)
        `
        )
        .eq('id', teamData.user_id)
        .maybeSingle();

      if (doctorData) {
        setDoctor(doctorData as any);
      }
    }
  };

  const loadMedicationCount = async (patientId: string) => {
    const { count } = await supabase
      .from('medications')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('is_active', true);

    setMedicationCount(count || 0);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild':
        return '#FFD700';
      case 'moderate':
        return '#FF9500';
      case 'severe':
        return '#FF3B30';
      default:
        return '#666666';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: insets.top }}>
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <User size={56} color="#8B5CF6" />
        </View>
        <Text style={[styles.profileName, isRTL && styles.rtl]}>
          {profile?.full_name}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Heart size={20} color="#EF4444" />
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {t.profile.chronicConditions}
          </Text>
        </View>

        {conditions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyText, isRTL && styles.rtl]}>
              {t.profile.noConditions}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={[
              styles.horizontalContent,
              isRTL && styles.horizontalContentRTL,
            ]}
          >
            {conditions.map((condition) => (
              <View key={condition.id} style={styles.horizontalCard}>
                <View style={[styles.cardIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Heart size={24} color="#EF4444" />
                </View>
                <Text
                  style={[styles.cardText, isRTL && styles.rtl]}
                  numberOfLines={2}
                >
                  {condition.condition_name}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Stethoscope size={20} color="#22C55E" />
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {t.profile.myDoctor}
          </Text>
        </View>

        {!doctor ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyText, isRTL && styles.rtl]}>
              {t.profile.noDoctor}
            </Text>
          </View>
        ) : (
          <View style={styles.doctorCard}>
            <View style={[styles.cardIcon, { backgroundColor: '#DCFCE7' }]}>
              <Stethoscope size={32} color="#22C55E" />
            </View>
            <View style={styles.doctorInfo}>
              <Text style={[styles.doctorName, isRTL && styles.rtl]}>
                {doctor.full_name}
              </Text>
              {doctor.specialization && (
                <Text style={[styles.doctorSpec, isRTL && styles.rtl]}>
                  {language === 'ar'
                    ? doctor.specialization.name_ar
                    : doctor.specialization.name_en}
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AlertCircle size={20} color="#F59E0B" />
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {t.profile.allergies}
          </Text>
        </View>

        {allergies.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyText, isRTL && styles.rtl]}>
              {t.profile.noAllergies}
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
            contentContainerStyle={[
              styles.horizontalContent,
              isRTL && styles.horizontalContentRTL,
            ]}
          >
            {allergies.map((allergy) => (
              <View key={allergy.id} style={styles.horizontalCard}>
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: getSeverityColor(allergy.severity) + '20' },
                  ]}
                >
                  <AlertCircle
                    size={24}
                    color={getSeverityColor(allergy.severity)}
                  />
                </View>
                <Text
                  style={[styles.cardText, isRTL && styles.rtl]}
                  numberOfLines={2}
                >
                  {allergy.medication_name}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Pill size={20} color="#8B5CF6" />
          <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
            {t.profile.myMedications}
          </Text>
        </View>

        <View style={styles.medicationCard}>
          <View style={[styles.cardIcon, { backgroundColor: '#EDE9FE', width: 72, height: 72 }]}>
            <Pill size={40} color="#8B5CF6" />
          </View>
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationNumber}>{medicationCount}</Text>
            <Text style={[styles.medicationLabel, isRTL && styles.rtl]}>
              {language === 'ar' ? 'دواء نشط' : 'Active medications'}
            </Text>
          </View>
        </View>
      </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: responsive.tabBarHeight + 16,
            right: isRTL ? undefined : responsive.padding,
            left: isRTL ? responsive.padding : undefined,
          },
        ]}
        onPress={() => router.push('/(tabs)/add')}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4ECFF',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4ECFF',
  },
  profileHeader: {
    backgroundColor: 'transparent',
    paddingTop: responsive.padding,
    paddingBottom: responsive.moderateScale(32),
    alignItems: 'center',
    borderBottomWidth: 0,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rtl: {
    textAlign: 'right',
  },
  section: {
    paddingHorizontal: responsive.padding,
    paddingVertical: responsive.padding,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  horizontalContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  horizontalContentRTL: {
    flexDirection: 'row-reverse',
  },
  horizontalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: 160,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  doctorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 16,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  doctorSpec: {
    fontSize: 14,
    color: '#666666',
  },
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  medicationInfo: {
    alignItems: 'center',
  },
  medicationNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  medicationLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    width: responsive.moderateScale(64),
    height: responsive.moderateScale(64),
    borderRadius: responsive.moderateScale(32),
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
});
