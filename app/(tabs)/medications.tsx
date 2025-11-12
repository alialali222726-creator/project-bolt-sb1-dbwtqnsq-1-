import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Plus,
  Pill,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
  ChevronDown,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import MedicationForm from '@/components/MedicationForm';
import DoseLogger from '@/components/DoseLogger';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency_per_day: number;
  minimum_interval_hours: number;
  instructions: string;
  is_active: boolean;
  last_dose_at: string | null;
  next_dose_due_at: string | null;
  patient_id: string;
  patients: {
    name: string;
  };
}

export default function MedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingDose, setConfirmingDose] = useState<string | null>(null);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(
    null
  );
  const [expandedMedicationId, setExpandedMedicationId] = useState<string | null>(
    null
  );
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [doseLoggerVisible, setDoseLoggerVisible] = useState(false);
  const [selectedMedicationForDose, setSelectedMedicationForDose] =
    useState<Medication | null>(null);
  const { profile } = useAuth();
  const { t, language } = useLanguage();

  const isRTL = language === 'ar';
  const isCaregiver =
    profile?.role === 'primary_caregiver' ||
    profile?.role === 'backup_caregiver';
  const isDoctor = profile?.role === 'doctor';
  const canManageMedications = isDoctor || isCaregiver;

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*, patients(name)')
        .eq('is_active', true)
        .order('next_dose_due_at', { ascending: true });

      if (error) throw error;
      setMedications(data || []);
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setLoading(false);
    }
  };

  const canConfirmDose = (medication: Medication): boolean => {
    if (!medication.last_dose_at) return true;

    const lastDose = new Date(medication.last_dose_at);
    const now = new Date();
    const hoursSinceLastDose =
      (now.getTime() - lastDose.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastDose >= medication.minimum_interval_hours;
  };

  const handleConfirmDose = async (medication: Medication) => {
    if (!canConfirmDose(medication)) {
      const lastDose = new Date(medication.last_dose_at!);
      const nextAllowed = new Date(
        lastDose.getTime() +
          medication.minimum_interval_hours * 60 * 60 * 1000
      );
      Alert.alert(
        t.common.error,
        `Cannot confirm dose yet. Next dose allowed at ${nextAllowed.toLocaleTimeString()}`
      );
      return;
    }

    setSelectedMedicationForDose(medication);
    setDoseLoggerVisible(true);
  };

  const handleDoseLoggerSubmit = async (data: {
    notes?: { type: string; content: string }[];
    images?: string[];
  }) => {
    if (!selectedMedicationForDose) return;

    setConfirmingDose(selectedMedicationForDose.id);

    try {
      const now = new Date();
      const nextDose = new Date(
        now.getTime() +
          selectedMedicationForDose.minimum_interval_hours * 60 * 60 * 1000
      );

      const wasOnTime = selectedMedicationForDose.next_dose_due_at
        ? now <= new Date(selectedMedicationForDose.next_dose_due_at)
        : true;

      const { data: doseLog, error: logError } = await supabase
        .from('dose_logs')
        .insert({
          medication_id: selectedMedicationForDose.id,
          patient_id: selectedMedicationForDose.patient_id,
          administered_at: now.toISOString(),
          administered_by: profile?.id,
          was_on_time: wasOnTime,
          status: 'confirmed',
        })
        .select()
        .single();

      if (logError) throw logError;

      if (data.notes && doseLog) {
        const notesData = data.notes.map((note) => ({
          dose_log_id: doseLog.id,
          note_type: note.type,
          content: note.content,
          created_by: profile?.id,
        }));

        const { error: notesError } = await supabase
          .from('dose_notes')
          .insert(notesData);

        if (notesError) throw notesError;
      }

      const { error: medError } = await supabase
        .from('medications')
        .update({
          last_dose_at: now.toISOString(),
          next_dose_due_at: nextDose.toISOString(),
        })
        .eq('id', selectedMedicationForDose.id);

      if (medError) throw medError;

      Alert.alert(t.common.success, 'Dose confirmed successfully');
      setDoseLoggerVisible(false);
      loadMedications();
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setConfirmingDose(null);
      setSelectedMedicationForDose(null);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isDoseOverdue = (nextDoseTime: string | null) => {
    if (!nextDoseTime) return false;
    return new Date(nextDoseTime) < new Date();
  };

  const handleAddMedication = () => {
    setEditingMedication(null);
    setFormModalVisible(true);
  };

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setFormModalVisible(true);
  };

  const handleDeleteMedication = async (medicationId: string) => {
    Alert.alert(
      t.common.delete,
      language === 'ar'
        ? 'هل أنت متأكد من حذف هذا الدواء؟'
        : 'Are you sure you want to delete this medication?',
      [
        { text: t.patients.cancel, style: 'cancel' },
        {
          text: t.common.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('medications')
                .delete()
                .eq('id', medicationId);

              if (error) throw error;
              Alert.alert(t.common.success, 'Medication deleted successfully');
              loadMedications();
            } catch (error: any) {
              Alert.alert(t.common.error, error.message);
            }
          },
        },
      ]
    );
  };

  const handleDeactivateMedication = async (medication: Medication) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({ is_active: false })
        .eq('id', medication.id);

      if (error) throw error;
      Alert.alert(t.common.success, 'Medication deactivated');
      loadMedications();
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const handleSubmitMedication = async (formData: any) => {
    setFormSubmitting(true);
    try {
      if (editingMedication) {
        const { error } = await supabase
          .from('medications')
          .update(formData)
          .eq('id', editingMedication.id);

        if (error) throw error;
        Alert.alert(t.common.success, 'Medication updated successfully');
      } else {
        // Get patient_id for the current user
        let patientId = medications[0]?.patient_id;

        if (!patientId) {
          // If no medications exist, find or create patient
          const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('created_by', profile?.id)
            .maybeSingle();

          if (existingPatient) {
            patientId = existingPatient.id;
          } else {
            // Create new patient
            const { data: newPatient, error: patientError } = await supabase
              .from('patients')
              .insert({
                name: profile?.full_name || 'Patient',
                created_by: profile?.id,
              })
              .select()
              .single();

            if (patientError) throw patientError;
            patientId = newPatient.id;

            // Add user to their own patient team
            await supabase
              .from('patient_team')
              .insert({
                patient_id: patientId,
                user_id: profile?.id,
                role: profile?.role || 'patient',
                assigned_by: profile?.id,
              });
          }
        }

        const { error } = await supabase.from('medications').insert({
          ...formData,
          patient_id: patientId,
          prescribed_by: profile?.id,
        });

        if (error) throw error;
        Alert.alert(t.common.success, 'Medication added successfully');
      }

      setFormModalVisible(false);
      loadMedications();
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setFormSubmitting(false);
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
      <View style={styles.header}>
        <Text style={[styles.title, isRTL && styles.rtl]}>
          {t.medications.title}
        </Text>
      </View>

      {canManageMedications && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddMedication}
        >
          <Plus size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>{t.medications.addMedication}</Text>
        </TouchableOpacity>
      )}

      {medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Pill size={64} color="#CCCCCC" />
          <Text style={[styles.emptyText, isRTL && styles.rtl]}>
            {t.medications.noMedications}
          </Text>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const overdue = isDoseOverdue(item.next_dose_due_at);
            const canConfirm = canConfirmDose(item);

            return (
              <View style={styles.medicationCard}>
                <View style={styles.medicationHeader}>
                  <View style={styles.medicationIcon}>
                    <Pill size={24} color="#8B5CF6" />
                  </View>
                  <View style={styles.medicationInfo}>
                    <Text style={[styles.medicationName, isRTL && styles.rtl]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.medicationPatient, isRTL && styles.rtl]}
                    >
                      {item.patients.name}
                    </Text>
                  </View>
                </View>

                <View style={styles.medicationDetails}>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isRTL && styles.rtl]}>
                      {t.medications.dosage}:
                    </Text>
                    <Text style={[styles.detailValue, isRTL && styles.rtl]}>
                      {item.dosage}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, isRTL && styles.rtl]}>
                      {t.medications.frequency}:
                    </Text>
                    <Text style={[styles.detailValue, isRTL && styles.rtl]}>
                      {item.frequency_per_day}x {t.common.today}
                    </Text>
                  </View>
                </View>

                <View style={styles.timeInfo}>
                  <View style={styles.timeRow}>
                    <Clock size={16} color="#666666" />
                    <Text style={[styles.timeLabel, isRTL && styles.rtl]}>
                      {t.medications.lastDose}:
                    </Text>
                    <Text style={[styles.timeValue, isRTL && styles.rtl]}>
                      {formatTime(item.last_dose_at)}
                    </Text>
                  </View>
                  <View style={styles.timeRow}>
                    <Clock
                      size={16}
                      color={overdue ? '#FF3B30' : '#34C759'}
                    />
                    <Text
                      style={[
                        styles.timeLabel,
                        isRTL && styles.rtl,
                        overdue && styles.overdueText,
                      ]}
                    >
                      {t.medications.nextDose}:
                    </Text>
                    <Text
                      style={[
                        styles.timeValue,
                        isRTL && styles.rtl,
                        overdue && styles.overdueText,
                      ]}
                    >
                      {formatTime(item.next_dose_due_at)}
                    </Text>
                  </View>
                </View>

                {(isCaregiver || isDoctor) && (
                  <View style={styles.actionButtons}>
                    {isCaregiver && (
                      <TouchableOpacity
                        style={[
                          styles.confirmButton,
                          !canConfirm && styles.confirmButtonDisabled,
                          confirmingDose === item.id && styles.confirmButtonLoading,
                        ]}
                        onPress={() => handleConfirmDose(item)}
                        disabled={!canConfirm || confirmingDose === item.id}
                      >
                        {confirmingDose === item.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <CheckCircle size={20} color="#FFFFFF" />
                            <Text style={styles.confirmButtonText}>
                              {t.doses.confirmDose}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {canManageMedications && (
                      <View style={styles.managementButtons}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditMedication(item)}
                        >
                          <Edit size={18} color="#8B5CF6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteMedication(item.id)}
                        >
                          <Trash2 size={18} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={formModalVisible}
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setFormModalVisible(false)}
              disabled={formSubmitting}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  formSubmitting && styles.textDisabled,
                ]}
              >
                {t.common.back}
              </Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.modalTitle,
                isRTL && styles.rtl,
              ]}
            >
              {editingMedication
                ? t.medications.medicationName
                : t.medications.addMedication}
            </Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView style={styles.modalBody}>
            <MedicationForm
              initialData={editingMedication || undefined}
              onSubmit={handleSubmitMedication}
              onCancel={() => setFormModalVisible(false)}
              isLoading={formSubmitting}
            />
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={doseLoggerVisible}
        animationType="slide"
        onRequestClose={() => setDoseLoggerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setDoseLoggerVisible(false)}
              disabled={confirmingDose !== null}
            >
              <Text
                style={[
                  styles.modalCloseText,
                  confirmingDose && styles.textDisabled,
                ]}
              >
                {t.common.back}
              </Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.modalTitle,
                isRTL && styles.rtl,
              ]}
            >
              {t.doses.confirmDose}
            </Text>
            <View style={{ width: 60 }} />
          </View>
          <DoseLogger
            onSubmit={handleDoseLoggerSubmit}
            onCancel={() => setDoseLoggerVisible(false)}
            isLoading={confirmingDose !== null}
          />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  medicationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  medicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  medicationPatient: {
    fontSize: 14,
    color: '#666666',
  },
  medicationDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  timeInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  overdueText: {
    color: '#FF3B30',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  confirmButtonLoading: {
    backgroundColor: '#8B5CF6',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionButtons: {
    gap: 12,
  },
  managementButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    margin: 20,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F4ECFF',
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalCloseText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  textDisabled: {
    color: '#CCCCCC',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
