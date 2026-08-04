import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppInput } from '../components/AppInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { AuthService } from '../services/AuthService';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { shadow } from '../theme/shadow';
import { STRINGS } from '../constants/strings';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const loginUser = useAuthStore((state) => state.loginUser);

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      Alert.alert('Validation Error', 'Please enter your email address.');
      return;
    }
    if (!cleanPassword) {
      Alert.alert('Validation Error', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await AuthService.login(cleanEmail, cleanPassword);
      loginUser(user);
    } catch (error: any) {
      Alert.alert('Authentication Failed', error.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.headerBox}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🚚</Text>
            </View>
            <Text style={styles.appName}>{STRINGS.APP_NAME}</Text>
            <Text style={styles.subtitle}>Web-Based Operations Mobile Platform</Text>
          </View>

          <View style={[styles.card, shadow.card]}>
            <Text style={styles.cardTitle}>{STRINGS.SIGN_IN_TITLE}</Text>
            
            <AppInput
              label={STRINGS.EMAIL_LABEL}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="e.g. driver@laundra.com"
            />

            <AppInput
              label={STRINGS.PASSWORD_LABEL}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <View style={styles.btnBox}>
              <PrimaryButton
                title={loading ? 'Authenticating...' : STRINGS.SIGN_IN_BTN}
                onPress={handleLogin}
                disabled={loading}
              />
            </View>

            <Text style={styles.footerNote}>
              🔒 Protected by Laundry SaaS Enterprise Security
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 70,
    height: 70,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadow.soft,
  },
  logoIcon: {
    fontSize: 34,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  btnBox: {
    marginTop: 10,
    marginBottom: 16,
  },
  footerNote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
});
