import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  SafeAreaView, StatusBar, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { PressableScale, AppText, Button } from '../components';
import { spacing, radius, fonts } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../utils/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    if (!name.trim()) return 'Please enter your name.';
    if (!email.trim()) return 'Please enter your email.';
    // simple email shape check; the server validates properly too
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    return '';
  };

  const onSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      // No auto-login: the emailed link is what signs you in.
      Alert.alert(
        'Check your email',
        `We sent a verification link to ${email.trim()}. Open it to finish signing in.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoCircle}>
            <AppText style={styles.logoText}>🏃</AppText>
          </View>
          <AppText style={styles.title}>Create your account</AppText>
          <AppText style={styles.subtitle}>Start your step-tracking journey</AppText>

          {error ? (
            <View style={styles.errorBox}>
              <AppText style={styles.errorText}>{error}</AppText>
            </View>
          ) : null}

          <AppText style={styles.label}>Name</AppText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Arjun Kumar"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            editable={!submitting}
          />

          <AppText style={styles.label}>Email</AppText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
          />

          <AppText style={styles.label}>Password</AppText>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!submitting}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
            <PressableScale onPress={() => setShowPassword(v => !v)} style={styles.showBtn}>
              <AppText style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</AppText>
            </PressableScale>
          </View>

          <Button
            label="Create account"
            onPress={onSubmit}
            loading={submitting}
            size="lg"
            full
            style={styles.primaryBtn}
          />

          <View style={styles.footerRow}>
            <AppText style={styles.footerText}>Already have an account? </AppText>
            <PressableScale onPress={() => navigation.navigate('Login')} disabled={submitting}>
              <AppText style={styles.footerLink}>Log in</AppText>
            </PressableScale>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryTint,
    borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  logoText: { fontSize: 34 },
  title: { fontSize: 26, fontFamily: fonts.display, color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 6, marginBottom: spacing.xl },

  errorBox: {
    backgroundColor: colors.warnBg,
    borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: 13, textAlign: 'center' },

  label: { fontSize: 13, fontFamily: fonts.medium, color: colors.textSecondary, marginBottom: 6, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 15, color: colors.text,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: 15, color: colors.text,
  },
  showBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  showBtnText: { color: colors.primary, fontSize: 13, fontFamily: fonts.semibold },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: fonts.semibold },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.muted, fontSize: 14 },
  footerLink: { color: colors.primary, fontSize: 14, fontFamily: fonts.semibold },
});
