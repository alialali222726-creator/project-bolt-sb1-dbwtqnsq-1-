import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

interface PatientAdherence {
  patient_id: string;
  patient_name: string;
  total_medications: number;
  total_doses_today: number;
  confirmed_doses_today: number;
  adherence_percentage: number;
  last_7_days_percentage: number;
}

export default function AdherenceScreen() {
  const [adherenceData, setAdherenceData] = useState<PatientAdherence[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { t, language } = useLanguage();

  const isRTL = language === 'ar';

  useEffect(() => {
    loadAdherenceData();
  }, []);

  const loadAdherenceData = async () => {
    try {
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, name');

      if (patientsError) throw patientsError;

      const adherencePromises = (patients || []).map(async (patient) => {
        const { data: medications } = await supabase
          .from('medications')
          .select('id, frequency_per_day')
          .eq('patient_id', patient.id)
          .eq('is_active', true);

        const totalMedications = medications?.length || 0;
        const expectedDosesToday =
          medications?.reduce(
            (sum, med) => sum + med.frequency_per_day,
            0
          ) || 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: dosesToday } = await supabase
          .from('dose_logs')
          .select('id, was_on_time')
          .eq('patient_id', patient.id)
          .gte('administered_at', today.toISOString());

        const confirmedDosesToday = dosesToday?.length || 0;
        const todayPercentage =
          expectedDosesToday > 0
            ? Math.round((confirmedDosesToday / expectedDosesToday) * 100)
            : 0;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: dosesLast7Days } = await supabase
          .from('dose_logs')
          .select('id')
          .eq('patient_id', patient.id)
          .gte('administered_at', sevenDaysAgo.toISOString());

        const expectedDosesLast7Days = expectedDosesToday * 7;
        const confirmedDosesLast7Days = dosesLast7Days?.length || 0;
        const last7DaysPercentage =
          expectedDosesLast7Days > 0
            ? Math.round(
                (confirmedDosesLast7Days / expectedDosesLast7Days) * 100
              )
            : 0;

        return {
          patient_id: patient.id,
          patient_name: patient.name,
          total_medications: totalMedications,
          total_doses_today: expectedDosesToday,
          confirmed_doses_today: confirmedDosesToday,
          adherence_percentage: todayPercentage,
          last_7_days_percentage: last7DaysPercentage,
        };
      });

      const results = await Promise.all(adherencePromises);
      setAdherenceData(results);
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAdherenceColor = (percentage: number) => {
    if (percentage >= 80) return '#34C759';
    if (percentage >= 60) return '#FF9500';
    return '#FF3B30';
  };

  const getAdherenceStatus = (percentage: number) => {
    if (percentage >= 80) return language === 'ar' ? 'ممتاز' : 'Excellent';
    if (percentage >= 60) return language === 'ar' ? 'جيد' : 'Good';
    return language === 'ar' ? 'يحتاج تحسين' : 'Needs Improvement';
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
      <View style={styles.header}>
        <Text style={[styles.title, isRTL && styles.rtl]}>
          {t.adherence.title}
        </Text>
      </View>

      {adherenceData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Activity size={64} color="#CCCCCC" />
          <Text style={[styles.emptyText, isRTL && styles.rtl]}>
            {t.adherence.noData}
          </Text>
        </View>
      ) : (
        <FlatList
          data={adherenceData}
          keyExtractor={(item) => item.patient_id}
          renderItem={({ item }) => {
            const adherenceColor = getAdherenceColor(
              item.adherence_percentage
            );
            const trend = item.adherence_percentage >= item.last_7_days_percentage;

            return (
              <View style={styles.adherenceCard}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.patientName, isRTL && styles.rtl]}>
                    {item.patient_name}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: adherenceColor },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getAdherenceStatus(item.adherence_percentage)}
                    </Text>
                  </View>
                </View>

                <View style={styles.scoreContainer}>
                  <View style={styles.scoreCircle}>
                    <Text
                      style={[
                        styles.scoreText,
                        { color: adherenceColor },
                      ]}
                    >
                      {item.adherence_percentage}%
                    </Text>
                    <Text style={[styles.scoreLabel, isRTL && styles.rtl]}>
                      {t.common.today}
                    </Text>
                  </View>

                  <View style={styles.trendContainer}>
                    {trend ? (
                      <TrendingUp size={24} color="#34C759" />
                    ) : (
                      <TrendingDown size={24} color="#FF3B30" />
                    )}
                    <Text
                      style={[
                        styles.trendText,
                        { color: trend ? '#34C759' : '#FF3B30' },
                      ]}
                    >
                      {item.last_7_days_percentage}%
                    </Text>
                    <Text style={[styles.trendLabel, isRTL && styles.rtl]}>
                      7 {language === 'ar' ? 'أيام' : 'days'}
                    </Text>
                  </View>
                </View>

                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, isRTL && styles.rtl]}>
                      {item.total_medications}
                    </Text>
                    <Text style={[styles.statLabel, isRTL && styles.rtl]}>
                      {t.medications.title}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, isRTL && styles.rtl]}>
                      {item.confirmed_doses_today}/{item.total_doses_today}
                    </Text>
                    <Text style={[styles.statLabel, isRTL && styles.rtl]}>
                      {t.doses.title} {t.common.today}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999999',
    marginTop: 16,
  },
  listContent: {
    padding: 20,
  },
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  scoreCircle: {
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  trendContainer: {
    alignItems: 'center',
  },
  trendText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  trendLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
  },
});
