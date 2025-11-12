import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t.common.error, 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  const isRTL = language === 'ar';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, isRTL && styles.rtl]}>
            {t.auth.login}
          </Text>
          <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
            <Text style={styles.langText}>{language === 'ar' ? 'EN' : 'ع'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, isRTL && styles.rtl]}>{t.auth.email}</Text>
          <TextInput
            style={[styles.input, isRTL && styles.rtlInput]}
            value={email}
            onChangeText={setEmail}
            placeholder={t.auth.email}
            keyboardType="email-address"
            autoCapitalize="none"
            textAlign={isRTL ? 'right' : 'left'}
          />

          <Text style={[styles.label, isRTL && styles.rtl]}>
            {t.auth.password}
          </Text>
          <TextInput
            style={[styles.input, isRTL && styles.rtlInput]}
            value={password}
            onChangeText={setPassword}
            placeholder={t.auth.password}
            secureTextEntry
            textAlign={isRTL ? 'right' : 'left'}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t.common.loading : t.auth.login}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={[styles.linkText, isRTL && styles.rtl]}>
              {t.auth.noAccount} {t.auth.register}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4ECFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rtl: {
    textAlign: 'right',
  },
  langButton: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  langText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  rtlInput: {
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#8B5CF6',
    fontSize: 16,
  },
});
