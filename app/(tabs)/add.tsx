import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Pill, Heart, AlertCircle, QrCode } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export default function AddScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const isRTL = language === 'ar';

  const options = [
    {
      id: 'patient',
      title: language === 'ar' ? 'مريض جديد' : 'New Patient',
      icon: Users,
      color: '#007AFF',
      bgColor: '#E3F2FD',
      action: () => router.push('/(tabs)/index'),
    },
    {
      id: 'medication',
      title: language === 'ar' ? 'دواء جديد' : 'New Medication',
      icon: Pill,
      color: '#34C759',
      bgColor: '#E8F5E9',
      action: () => router.push('/(tabs)/medications'),
    },
    {
      id: 'condition',
      title: language === 'ar' ? 'مرض مزمن' : 'Chronic Condition',
      icon: Heart,
      color: '#FF3B30',
      bgColor: '#FFEBEE',
      action: () => {},
    },
    {
      id: 'allergy',
      title: language === 'ar' ? 'حساسية دواء' : 'Drug Allergy',
      icon: AlertCircle,
      color: '#FF9500',
      bgColor: '#FFF3E0',
      action: () => {},
    },
    {
      id: 'doctor',
      title: language === 'ar' ? 'ربط طبيب' : 'Link Doctor',
      icon: QrCode,
      color: '#5856D6',
      bgColor: '#EDE7F6',
      action: () => {},
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, isRTL && styles.rtl]}>
          {language === 'ar' ? 'ماذا تريد أن تضيف؟' : 'What would you like to add?'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: option.bgColor }]}>
                <Icon size={32} color={option.color} />
              </View>
              <Text style={[styles.optionTitle, isRTL && styles.rtl]}>
                {option.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    minHeight: 80,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  optionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
