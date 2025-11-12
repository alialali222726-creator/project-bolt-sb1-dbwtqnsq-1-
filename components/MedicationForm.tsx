import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

interface MedicationFormProps {
  initialData?: {
    id?: string;
    name: string;
    dosage: string;
    frequency_per_day: number;
    minimum_interval_hours: number;
    instructions: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function MedicationForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: MedicationFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    dosage: initialData?.dosage || '',
    frequency_per_day: initialData?.frequency_per_day.toString() || '1',
    minimum_interval_hours: initialData?.minimum_interval_hours.toString() || '8',
    instructions: initialData?.instructions || '',
  });

  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.dosage.trim()) {
      Alert.alert(t.common.error, 'Please fill in all required fields');
      return;
    }

    const frequency = parseInt(formData.frequency_per_day);
    const interval = parseFloat(formData.minimum_interval_hours);

    if (frequency <= 0 || interval <= 0) {
      Alert.alert(t.common.error, 'Please enter valid numbers');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        frequency_per_day: frequency,
        minimum_interval_hours: interval,
      });
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={[styles.label, isRTL && styles.rtl]}>
          {t.medications.medicationName} *
        </Text>
        <TextInput
          style={[styles.input, isRTL && styles.rtlInput]}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder={t.medications.medicationName}
          textAlign={isRTL ? 'right' : 'left'}
          editable={!isLoading}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isRTL && styles.rtl]}>
          {t.medications.dosage} *
        </Text>
        <TextInput
          style={[styles.input, isRTL && styles.rtlInput]}
          value={formData.dosage}
          onChangeText={(text) => setFormData({ ...formData, dosage: text })}
          placeholder="500mg"
          textAlign={isRTL ? 'right' : 'left'}
          editable={!isLoading}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.flex1]}>
          <Text style={[styles.label, isRTL && styles.rtl]}>
            {t.medications.frequency} *
          </Text>
          <TextInput
            style={[styles.input, isRTL && styles.rtlInput]}
            value={formData.frequency_per_day}
            onChangeText={(text) =>
              setFormData({ ...formData, frequency_per_day: text })
            }
            placeholder="1"
            keyboardType="number-pad"
            textAlign={isRTL ? 'right' : 'left'}
            editable={!isLoading}
          />
        </View>

        <View style={[styles.formGroup, styles.flex1]}>
          <Text style={[styles.label, isRTL && styles.rtl]}>
            {t.medications.minimumInterval} *
          </Text>
          <TextInput
            style={[styles.input, isRTL && styles.rtlInput]}
            value={formData.minimum_interval_hours}
            onChangeText={(text) =>
              setFormData({ ...formData, minimum_interval_hours: text })
            }
            placeholder="8"
            keyboardType="decimal-pad"
            textAlign={isRTL ? 'right' : 'left'}
            editable={!isLoading}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isRTL && styles.rtl]}>
          {t.medications.instructions}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea, isRTL && styles.rtlInput]}
          value={formData.instructions}
          onChangeText={(text) =>
            setFormData({ ...formData, instructions: text })
          }
          placeholder={t.medications.instructions}
          multiline
          numberOfLines={3}
          textAlign={isRTL ? 'right' : 'left'}
          editable={!isLoading}
        />
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>{t.patients.cancel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>{t.patients.save}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  rtl: {
    textAlign: 'right',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '700',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
