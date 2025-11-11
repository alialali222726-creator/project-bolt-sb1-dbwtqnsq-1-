import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, User } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

interface Patient {
  id: string;
  name: string;
  date_of_birth: string | null;
  medical_notes: string;
}

export default function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    date_of_birth: '',
    medical_notes: '',
  });
  const { profile, signOut } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const isRTL = language === 'ar';
  const isDoctor = profile?.role === 'doctor';

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatient = async () => {
    if (!newPatient.name.trim()) {
      Alert.alert(t.common.error, 'Patient name is required');
      return;
    }

    try {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .insert({
          name: newPatient.name,
          date_of_birth: newPatient.date_of_birth || null,
          medical_notes: newPatient.medical_notes,
          created_by: profile?.id,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      if (patient) {
        const { error: teamError } = await supabase.from('patient_team').insert({
          patient_id: patient.id,
          user_id: profile?.id,
          role: profile?.role,
          assigned_by: profile?.id,
        });

        if (teamError) throw teamError;
      }

      setNewPatient({ name: '', date_of_birth: '', medical_notes: '' });
      setModalVisible(false);
      loadPatients();
      Alert.alert(t.common.success, 'Patient added successfully');
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
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
        <View>
          <Text style={[styles.title, isRTL && styles.rtl]}>
            {t.patients.title}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.rtl]}>
            {profile?.full_name}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{t.auth.logout}</Text>
        </TouchableOpacity>
      </View>

      {isDoctor && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>{t.patients.addPatient}</Text>
        </TouchableOpacity>
      )}

      {patients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <User size={64} color="#CCCCCC" />
          <Text style={[styles.emptyText, isRTL && styles.rtl]}>
            {t.patients.noPatients}
          </Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.patientCard}
              onPress={() => {
                // Navigate to patient detail (implement later)
              }}
            >
              <View style={styles.patientIcon}>
                <User size={32} color="#007AFF" />
              </View>
              <View style={styles.patientInfo}>
                <Text style={[styles.patientName, isRTL && styles.rtl]}>
                  {item.name}
                </Text>
                {item.date_of_birth && (
                  <Text style={[styles.patientDetail, isRTL && styles.rtl]}>
                    {new Date(item.date_of_birth).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.rtl]}>
              {t.patients.addPatient}
            </Text>

            <Text style={[styles.label, isRTL && styles.rtl]}>
              {t.patients.patientName}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={newPatient.name}
              onChangeText={(text) =>
                setNewPatient({ ...newPatient, name: text })
              }
              placeholder={t.patients.patientName}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.label, isRTL && styles.rtl]}>
              {t.patients.dateOfBirth}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.rtlInput]}
              value={newPatient.date_of_birth}
              onChangeText={(text) =>
                setNewPatient({ ...newPatient, date_of_birth: text })
              }
              placeholder="YYYY-MM-DD"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[styles.label, isRTL && styles.rtl]}>
              {t.patients.medicalNotes}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, isRTL && styles.rtlInput]}
              value={newPatient.medical_notes}
              onChangeText={(text) =>
                setNewPatient({ ...newPatient, medical_notes: text })
              }
              placeholder={t.patients.medicalNotes}
              multiline
              numberOfLines={4}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>{t.patients.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddPatient}
              >
                <Text style={styles.saveButtonText}>{t.patients.save}</Text>
              </TouchableOpacity>
            </View>
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
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  rtl: {
    textAlign: 'right',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
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
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  patientIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  patientDetail: {
    fontSize: 14,
    color: '#666666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
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
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
