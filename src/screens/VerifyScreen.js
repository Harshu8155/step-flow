import React, { useEffect, useState, useMemo } from 'react';
import {
  View, StyleSheet, SafeAreaView, StatusBar,
} from 'react-native';
import { PressableScale, AppText, Button, Loader } from '../components';
import { spacing, radius, fonts } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../utils/AuthContext';

/**
 * Landing point for the email magic link: stepflowapp://verify?token=...
 * Reads the token, exchanges it for a session, and — on success — the auth
 * state flips so RootNavigator swaps to the main app (Home) automatically.
 */
export default function VerifyScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { exchangeToken } = useAuth();
  const [error, setError] = useState('');

  const token = route.params?.token;

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setError('This link is missing its verification token.');
        return;
      }
      try {
        await exchangeToken(token);
        // Success: isAuthenticated becomes true -> RootNavigator shows the tabs.
      } catch (e) {
        if (active) setError(e.message || 'Could not verify this link.');
      }
    })();
    return () => { active = false; };
  }, [token]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={styles.center}>
        {error ? (
          <>
            <AppText style={styles.title}>Verification failed</AppText>
            <AppText style={styles.msg}>{error}</AppText>
            <Button
              label="Back to login"
              onPress={() => navigation.navigate('Login')}
              size="lg"
              full
              style={styles.btn}
            />
          </>
        ) : (
          <>
            <Loader size={64} />
            <AppText style={styles.msg}>Verifying and signing you in…</AppText>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { fontSize: 20, fontFamily: fonts.display, color: colors.text, marginBottom: spacing.sm },
  msg: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: spacing.md },
  btn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  btnText: { color: '#fff', fontSize: 15, fontFamily: fonts.semibold },
});
