import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Camera, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLanguage } from '@/contexts/LanguageContext';

interface DoseLoggerProps {
  onSubmit: (data: {
    notes?: { type: string; content: string }[];
    images?: string[];
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

type NoteType = 'vomit' | 'delayed' | 'refused' | 'notes';

export default function DoseLogger({
  onSubmit,
  onCancel,
  isLoading = false,
}: DoseLoggerProps) {
  const [notes, setNotes] = useState<{ type: NoteType; content: string }[]>([]);
  const [customNote, setCustomNote] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const noteTypes: NoteType[] = ['vomit', 'delayed', 'refused'];

  const getNoteLabel = (type: NoteType) => {
    const labels: Record<NoteType, string> = {
      vomit: language === 'ar' ? 'تقيء' : 'Vomiting',
      delayed: language === 'ar' ? 'تأجيل' : 'Delayed',
      refused: language === 'ar' ? 'رفض' : 'Refused',
      notes: language === 'ar' ? 'ملاحظات' : 'Notes',
    };
    return labels[type];
  };

  const toggleNote = (type: NoteType) => {
    setNotes((prev) => {
      const exists = prev.find((n) => n.type === type);
      if (exists) {
        return prev.filter((n) => n.type !== type);
      } else {
        return [...prev, { type, content: '' }];
      }
    });
  };

  const updateNoteContent = (type: NoteType, content: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.type === type ? { ...n, content } : n))
    );
  };

  const handleAddCustomNote = () => {
    if (customNote.trim()) {
      setNotes((prev) => [...prev, { type: 'notes', content: customNote }]);
      setCustomNote('');
    }
  };

  const removeNote = (index: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          t.common.error,
          language === 'ar'
            ? 'لا يمكن الوصول للكاميرا'
            : 'Camera permission is required'
        );
        return;
      }
    }
    setShowCamera(true);
  };

  const handleSubmit = async () => {
    try {
      await onSubmit({
        notes: notes.length > 0 ? notes : undefined,
        images: images.length > 0 ? images : undefined,
      });
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing="back">
          <View style={styles.cameraButtons}>
            <TouchableOpacity
              style={styles.cameraCancelButton}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.cameraCancelText}>{t.common.back}</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
          {language === 'ar' ? 'ملاحظات الجرعة' : 'Dose Notes'}
        </Text>

        <View style={styles.notesGrid}>
          {noteTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.noteButton,
                notes.some((n) => n.type === type) && styles.noteButtonActive,
              ]}
              onPress={() => toggleNote(type)}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.noteButtonText,
                  notes.some((n) => n.type === type) &&
                    styles.noteButtonTextActive,
                ]}
              >
                {getNoteLabel(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {notes.map((note, index) => (
          <View key={index} style={styles.noteInputContainer}>
            <View
              style={[styles.noteInputHeader, isRTL && styles.rtlFlex]}
            >
              <Text style={[styles.noteInputLabel, isRTL && styles.rtl]}>
                {getNoteLabel(note.type)}
              </Text>
              <TouchableOpacity
                onPress={() => removeNote(index)}
                disabled={isLoading}
              >
                <X size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.noteInput,
                isRTL && styles.rtlInput,
              ]}
              value={note.content}
              onChangeText={(text) =>
                updateNoteContent(note.type, text)
              }
              placeholder={language === 'ar' ? 'إضافة تفاصيل...' : 'Add details...'}
              multiline
              numberOfLines={2}
              editable={!isLoading}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        ))}

        <View style={styles.customNoteContainer}>
          <TextInput
            style={[styles.customNoteInput, isRTL && styles.rtlInput]}
            value={customNote}
            onChangeText={setCustomNote}
            placeholder={language === 'ar' ? 'إضافة ملاحظة مخصصة...' : 'Add custom note...'}
            editable={!isLoading}
            textAlign={isRTL ? 'right' : 'left'}
          />
          <TouchableOpacity
            style={[styles.addNoteButton, !customNote.trim() && styles.buttonDisabled]}
            onPress={handleAddCustomNote}
            disabled={!customNote.trim() || isLoading}
          >
            <Text style={styles.addNoteButtonText}>
              {language === 'ar' ? 'إضافة' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
          {language === 'ar' ? 'صور العبوة' : 'Package Images'}
        </Text>

        <TouchableOpacity
          style={styles.cameraButton}
          onPress={handleTakePhoto}
          disabled={isLoading}
        >
          <Camera size={24} color="#FFFFFF" />
          <Text style={styles.cameraButtonText}>
            {language === 'ar' ? 'التقط صورة' : 'Take Photo'}
          </Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <Text style={[styles.imageCountText, isRTL && styles.rtl]}>
            {images.length} {language === 'ar' ? 'صورة' : 'image(s)'}
          </Text>
        )}
      </View>

      <View style={styles.buttons}>
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
            <Text style={styles.submitButtonText}>{t.common.confirm}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraButtons: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  cameraCancelButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cameraCancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  rtl: {
    textAlign: 'right',
  },
  rtlFlex: {
    flexDirection: 'row-reverse',
  },
  rtlInput: {
    textAlign: 'right',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  noteButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  noteButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  noteButtonText: {
    textAlign: 'center',
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
  },
  noteButtonTextActive: {
    color: '#007AFF',
  },
  noteInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  noteInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  noteInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  customNoteContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  customNoteInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addNoteButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addNoteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
  },
  cameraButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  imageCountText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  submitButton: {
    backgroundColor: '#34C759',
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
