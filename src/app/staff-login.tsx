import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStaffAuth } from '../contexts/staff-auth-context';

export default function StaffLoginScreen() {
  const { error, isLoading, isStaff, signIn } = useStaffAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isStaff) router.replace('/admin');
  }, [isStaff]);

  const handleSubmit = () => {
    void signIn(email, password);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity onPress={() => router.replace('/')}>
            <Text style={styles.backText}>‹ Back to ranch</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.eyebrow}>WHITE OAK RANCH</Text>
            <Text style={styles.title}>Staff sign in</Text>
            <Text style={styles.subtitle}>
              Sign in with your staff account to access ranch operations.
            </Text>

            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="staff@example.com"
              placeholderTextColor="#9B9B91"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#9B9B91"
              secureTextEntry
              style={styles.input}
              value={password}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              disabled={isLoading}
              onPress={handleSubmit}
              style={[styles.submitButton, isLoading && styles.disabledButton]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>SIGN IN</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F4F1E8',
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backText: {
    color: '#203B2A',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  eyebrow: {
    color: '#9B8A68',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  title: {
    color: '#203B2A',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    color: '#747873',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },
  label: {
    color: '#203B2A',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 7,
    marginTop: 14,
  },
  input: {
    borderColor: '#D7D8CF',
    borderRadius: 12,
    borderWidth: 1,
    color: '#203B2A',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  error: {
    color: '#A13D35',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#203B2A',
    borderRadius: 12,
    marginTop: 24,
    minHeight: 50,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
});
