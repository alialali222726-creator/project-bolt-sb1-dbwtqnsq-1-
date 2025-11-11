import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  Heart,
  Activity,
  Pill,
  Send,
  X,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

interface ChronicCondition {
  id: string;
  condition_name: string;
  notes: string;
}

interface MedicalRange {
  id: string;
  condition_name: string;
  parameter_name: string;
  min_value: number;
  max_value: number;
  unit: string;
  description: string;
}

interface Medication {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: number;
}

interface CuppingRequest {
  id: string;
  medication: {
    medication_name: string;
    dosage: string;
  };
  request_type: string;
  duration_hours: number;
  duration_days: number;
  status: string;
  created_at: string;
  doctor_response: string;
}

export default function CuppingScreen() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [conditions, setConditions] = useState<ChronicCondition[]>([]);
  const [ranges, setRanges] = useState<MedicalRange[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [requests, setRequests] = useState<CuppingRequest[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [rangesModalVisible, setRangesModalVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    medication_id: '',
    request_type: 'pause' as 'pause' | 'adjust',
    duration_hours: 0,
    duration_days: 0,
    notes_before: '',
    notes_after: '',
    cupping_date: '',
  });

  const isRTL = language === 'ar';
  const isCupper = profile?.role === 'cupper';

  useEffect(() => {
    if (isCupper) {
      loadCupperData();
    }
  }, []);

  const loadCupperData = async () => {
    try {
      setLoading(true);

      const { data: teamData } = await supabase
        .from('patient_team')
        .select('patient_id, patients!inner(id), role')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (teamData) {
        const patientId = teamData.patient_id;
        setSelectedPatientId(patientId);

        const { data: doctorTeam } = await supabase
          .from('patient_team')
          .select('user_id')
          .eq('patient_id', patientId)
          .eq('role', 'doctor')
          .maybeSingle();

        if (doctorTeam) {
          setSelectedDoctorId(doctorTeam.user_id);
        }

        await Promise.all([
          loadConditions(patientId),
          loadMedications(patientId),
          loadRequests(),
        ]);
      }

      await loadRanges();
    } catch (error: any) {
      console.error('Error loading cupper data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConditions = async (patientId: string) => {
    const { data } = await supabase
      .from('chronic_conditions')
      .select('*')
      .eq('patient_id', patientId);

    setConditions(data || []);
  };

  const loadRanges = async () => {
    const { data } = await supabase
      .from('medical_reference_ranges')
      .select('*')
      .order('condition_name', { ascending: true });

    setRanges(data || []);
  };

  const loadMedications = async (patientId: string) => {
    const { data } = await supabase
      .from('medications')
      .select('id, medication_name, dosage, frequency')
      .eq('patient_id', patientId)
      .eq('is_active', true);

    setMedications(data || []);
  };

  const loadRequests = async () => {
    const { data } = await supabase
      .from('cupping_medication_requests')
      .select(
        `
        *,
        medication:medications(medication_name, dosage)
      `
      )
      .eq('cupper_id', profile?.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
  };

  const handleSendRequest = async () => {
    if (!formData.medication_id) {
      Alert.alert(t.common.error, 'Please select a medication');
      return;
    }

    if (!selectedDoctorId || !selectedPatientId) {
      Alert.alert(t.common.error, 'Doctor or patient not found');
      return;
    }

    try {
      const { error } = await supabase.from('cupping_medication_requests').insert({
        cupper_id: profile?.id,
        patient_id: selectedPatientId,
        doctor_id: selectedDoctorId,
        medication_id: formData.medication_id,
        request_type: formData.request_type,
        duration_hours: formData.duration_hours || null,
        duration_days: formData.duration_days || null,
        notes_before: formData.notes_before,
        notes_after: formData.notes_after,
        cupping_date: formData.cupping_date || null,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert(t.common.success, t.cupping.requestSent);
      setModalVisible(false);
      resetForm();
      loadRequests();
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      medication_id: '',
      request_type: 'pause',
      duration_hours: 0,
      duration_days: 0,
      notes_before: '',
      notes_after: '',
      cupping_date: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'completed':
        return '#007AFF';
      default:
        return '#666666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t.common.pending;
      case 'approved':
        return t.cupping.approved;
      case 'rejected':
        return t.cupping.rejected;
      case 'completed':
        return t.cupping.completed;
      default:
        return status;
    }
  };

  if (!isCupper) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={48} color="#FF3B30" />
        <Text style={[styles.errorText, isRTL && styles.rtl]}>
          {language === 'ar'
            ? 'هذه الصفحة مخصصة للحجامين فقط'
            : 'This page is for cuppers only'}
        </Text>
      </View>
    );
  }

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
          {t.cupping.title}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ {t.cupping.newRequest}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Heart size={20} color="#FF3B30" />
            <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
              {t.cupping.chronicConditions}
            </Text>
          </View>

          {conditions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyText, isRTL && styles.rtl]}>
                {t.profile.noConditions}
              </Text>
            </View>
          ) : (
            <View style={styles.conditionsContainer}>
              {conditions.map((condition) => (
                <View key={condition.id} style={styles.conditionCard}>
                  <Text style={[styles.conditionName, isRTL && styles.rtl]}>
                    {condition.condition_name}
                  </Text>
                  {condition.notes && (
                    <Text style={[styles.conditionNotes, isRTL && styles.rtl]}>
                      {condition.notes}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.viewRangesButton}
            onPress={() => setRangesModalVisible(true)}
          >
            <Activity size={20} color="#007AFF" />
            <Text style={styles.viewRangesText}>{t.cupping.viewRanges}</Text>
            <ChevronRight size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Send size={20} color="#007AFF" />
            <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
              {language === 'ar' ? 'الطلبات المرسلة' : 'Sent Requests'}
            </Text>
          </View>

          {requests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={[styles.emptyText, isRTL && styles.rtl]}>
                {t.cupping.noRequests}
              </Text>
            </View>
          ) : (
            <View style={styles.requestsContainer}>
              {requests.map((request) => (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={[styles.requestMed, isRTL && styles.rtl]}>
                      {request.medication?.medication_name}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(request.status) },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {getStatusLabel(request.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.requestType, isRTL && styles.rtl]}>
                    {request.request_type === 'pause'
                      ? t.cupping.pause
                      : t.cupping.adjust}
                    {' - '}
                    {request.duration_days > 0 &&
                      `${request.duration_days} ${t.cupping.days}`}
                    {request.duration_hours > 0 &&
                      `${request.duration_hours} ${t.cupping.hours}`}
                  </Text>
                  {request.doctor_response && (
                    <View style={styles.responseBox}>
                      <Text style={[styles.responseLabel, isRTL && styles.rtl]}>
                        {t.cupping.doctorResponse}:
                      </Text>
                      <Text style={[styles.responseText, isRTL && styles.rtl]}>
                        {request.doctor_response}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
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
                {t.cupping.newRequest}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={[styles.label, isRTL && styles.rtl]}>
                {t.cupping.medication} *
              </Text>
              <View style={styles.medicationPicker}>
                {medications.map((med) => (
                  <TouchableOpacity
                    key={med.id}
                    style={[
                      styles.medicationOption,
                      formData.medication_id === med.id &&
                        styles.medicationOptionActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, medication_id: med.id })
                    }
                  >
                    <Text
                      style={[
                        styles.medicationOptionText,
                        formData.medication_id === med.id &&
                          styles.medicationOptionTextActive,
                      ]}
                    >
                      {med.medication_name} - {med.dosage}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, isRTL && styles.rtl]}>
                {t.cupping.requestType}
              </Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.request_type === 'pause' && styles.typeButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, request_type: 'pause' })
                  }
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.request_type === 'pause' &&
                        styles.typeButtonTextActive,
                    ]}
                  >
                    {t.cupping.pause}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.request_type === 'adjust' && styles.typeButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, request_type: 'adjust' })
                  }
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.request_type === 'adjust' &&
                        styles.typeButtonTextActive,
                    ]}
                  >
                    {t.cupping.adjust}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, isRTL && styles.rtl]}>
                {t.cupping.duration}
              </Text>
              <View style={styles.durationRow}>
                <View style={styles.durationInput}>
                  <TextInput
                    style={[styles.input, isRTL && styles.rtlInput]}
                    value={formData.duration_days.toString()}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        duration_days: parseInt(text) || 0,
                      })
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                  <Text style={styles.durationLabel}>{t.cupping.days}</Text>
                </View>
                <View style={styles.durationInput}>
                  <TextInput
                    style={[styles.input, isRTL && styles.rtlInput]}
                    value={formData.duration_hours.toString()}
                    onChangeText={(text) =>
                      setFormData({
                        ...formData,
                        duration_hours: parseInt(text) || 0,
                      })
                    }
                    placeholder="0"
                    keyboardType="numeric"
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                  <Text style={styles.durationLabel}>{t.cupping.hours}</Text>
                </View>
              </View>

              <Text style={[styles.label, isRTL && styles.rtl]}>
                {t.cupping.notesBefore}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, isRTL && styles.rtlInput]}
                value={formData.notes_before}
                onChangeText={(text) =>
                  setFormData({ ...formData, notes_before: text })
                }
                placeholder={t.cupping.notesBefore}
                multiline
                numberOfLines={3}
                textAlign={isRTL ? 'right' : 'left'}
              />

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSendRequest}
              >
                <Text style={styles.submitButtonText}>
                  {t.cupping.sendToDoctor}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rangesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRangesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
                {t.cupping.normalRanges}
              </Text>
              <TouchableOpacity onPress={() => setRangesModalVisible(false)}>
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {ranges.map((range) => (
                <View key={range.id} style={styles.rangeCard}>
                  <Text style={[styles.rangeName, isRTL && styles.rtl]}>
                    {range.condition_name}
                  </Text>
                  <Text style={[styles.rangeParameter, isRTL && styles.rtl]}>
                    {range.parameter_name}
                  </Text>
                  <Text style={[styles.rangeValues, isRTL && styles.rtl]}>
                    {range.min_value} - {range.max_value} {range.unit}
                  </Text>
                  {range.description && (
                    <Text style={[styles.rangeDescription, isRTL && styles.rtl]}>
                      {range.description}
                    </Text>
                  )}
                </View>
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
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rtl: {
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
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
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
  },
  conditionsContainer: {
    gap: 12,
    marginBottom: 12,
  },
  conditionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  conditionName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  conditionNotes: {
    fontSize: 14,
    color: '#666666',
  },
  viewRangesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  viewRangesText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  requestsContainer: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestMed: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  requestType: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  responseBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#1A1A1A',
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
    maxHeight: '85%',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  medicationPicker: {
    marginBottom: 16,
    gap: 8,
  },
  medicationOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  medicationOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  medicationOptionText: {
    fontSize: 16,
    color: '#666666',
  },
  medicationOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  typeButtonTextActive: {
    color: '#007AFF',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  durationInput: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 8,
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
  rangeCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rangeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  rangeParameter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
  },
  rangeValues: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  rangeDescription: {
    fontSize: 12,
    color: '#666666',
  },
});
