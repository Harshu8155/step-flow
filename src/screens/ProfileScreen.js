import React, { useState, useMemo, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, SafeAreaView, StatusBar, Alert, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, radius, fonts, type, TAB_BAR_CLEARANCE } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useSteps } from '../utils/StepContext';
import useRefreshControl from '../utils/useRefreshControl';
import { useAuth } from '../utils/AuthContext';
import {
  AppleHealthIcon, GoogleFitIcon, FitbitIcon,
} from '../../assets/SvgIcons';
import { requestPermissionsAsync, scheduleDailyReminder, cancelAllReminders } from '../utils/NotificationService';
import { notifyWarning } from '../utils/haptics';
import {
  GradientBackground, GlassCard, Entrance, LineIcon, AppText, BottomSheet,
  PressableScale, Button, Toggle,
} from '../components';

function initialsFromName(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + second).toUpperCase() || '?';
}

export default function ProfileScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { refreshControl } = useRefreshControl();
  const { user, logout } = useAuth();
  const [toggles, setToggles] = useState({ notifications: false });
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);

  const [reminderTime, setReminderTime] = useState('20:00');
  const [pickerHour, setPickerHour] = useState(8);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerAmPm, setPickerAmPm] = useState('PM');

  const {
    todaySteps, weeklySteps, dailySteps, records, resetSteps,
    dailyGoal, setDailyGoal, unit, setUnit,
  } = useSteps();

  const [tempGoal, setTempGoal] = useState(String(dailyGoal));

  useEffect(() => {
    (async () => {
      try {
        const storedNotif = await AsyncStorage.getItem('notifications_enabled_v1');
        const storedTime = await AsyncStorage.getItem('reminder_time_v1');
        if (storedNotif !== null) setToggles(prev => ({ ...prev, notifications: storedNotif === 'true' }));
        if (storedTime) setReminderTime(storedTime);
      } catch (err) {
        console.warn('Failed to load profile notification settings:', err);
      }
    })();
  }, []);

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '8:00 PM';
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const handleToggle = async (key) => {
    if (key === 'notifications') {
      const nextVal = !toggles.notifications;
      if (nextVal) {
        const granted = await requestPermissionsAsync();
        if (granted) {
          const [hStr, mStr] = reminderTime.split(':');
          await scheduleDailyReminder(parseInt(hStr, 10), parseInt(mStr, 10));
          setToggles(prev => ({ ...prev, notifications: true }));
          await AsyncStorage.setItem('notifications_enabled_v1', 'true');
        } else {
          Alert.alert('Permissions Required', 'Please allow notification permissions in your device settings to enable daily reminders.', [{ text: 'OK' }]);
        }
      } else {
        await cancelAllReminders();
        setToggles(prev => ({ ...prev, notifications: false }));
        await AsyncStorage.setItem('notifications_enabled_v1', 'false');
      }
    } else {
      setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleOpenTimePicker = () => {
    const [hStr, mStr] = reminderTime.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    let ampm = 'AM';
    if (h >= 12) { ampm = 'PM'; if (h > 12) h -= 12; } else if (h === 0) h = 12;
    setPickerHour(h);
    setPickerMinute(m);
    setPickerAmPm(ampm);
    setTimeModalVisible(true);
  };

  const handleSaveTimePicker = async () => {
    let hour24 = pickerHour;
    if (pickerAmPm === 'AM') { if (pickerHour === 12) hour24 = 0; }
    else { if (pickerHour !== 12) hour24 = pickerHour + 12; }
    const timeStr = `${String(hour24).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    setReminderTime(timeStr);
    await AsyncStorage.setItem('reminder_time_v1', timeStr);
    if (toggles.notifications) await scheduleDailyReminder(hour24, pickerMinute);
    setTimeModalVisible(false);
  };

  const handleResetPress = () => {
    notifyWarning();
    Alert.alert('Reset all data', 'Are you sure you want to clear all step history? This action cannot be undone and all values will become 0.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: resetSteps }]);
  };

  const settingsList = useMemo(() => [
    { icon: 'target', label: 'Daily step goal', value: dailyGoal.toLocaleString(), actionType: 'goal', hasArrow: true },
    { icon: 'clock', label: 'Reminder time', value: formatTime12h(reminderTime), actionType: 'reminder', hasArrow: true },
    { icon: 'ruler', label: 'Units', value: unit, actionType: 'unit', hasArrow: true },
    { icon: 'bell', label: 'Notifications', toggle: true, toggleKey: 'notifications' },
    { icon: 'moon', label: 'Dark mode', toggle: true, toggleKey: 'darkMode' },
    { icon: 'upload', label: 'Export data', actionType: 'export', hasArrow: true },
    { icon: 'refresh', label: 'Reset all data', isReset: true },
  ], [dailyGoal, unit, reminderTime]);

  const streak = records.longestStreak;
  const totalWeeklySteps = weeklySteps.reduce((a, b) => a + b, 0);
  const earnedBadges = [todaySteps >= 1000, totalWeeklySteps >= 50000, todaySteps >= dailyGoal, todaySteps >= dailyGoal * 2].filter(Boolean).length;

  const allDayValues = Object.values(dailySteps);
  const lifetimeSteps = allDayValues.reduce((a, b) => a + b, 0);
  const activeDays = allDayValues.filter(v => v > 0).length;
  const formatLifetimeSteps = (val) => (val >= 1000000 ? (val / 1000000).toFixed(2) + 'M' : val.toLocaleString());
  const distanceMultiplier = unit === 'Imperial' ? 0.0004736 : 0.000762;
  const distanceUnit = unit === 'Imperial' ? 'mi' : 'km';
  const lifetimeDistance = (lifetimeSteps * distanceMultiplier).toFixed(1);
  const lifetimeCalories = Math.round(lifetimeSteps * 0.04);

  // Unified hierarchy: neutral values (accent reserved for state elsewhere).
  const lifetimeStats = [
    { label: 'Total steps', value: formatLifetimeSteps(lifetimeSteps), color: colors.text },
    { label: 'Distance', value: `${lifetimeDistance} ${distanceUnit}`, color: colors.text },
    { label: 'Active days', value: activeDays.toLocaleString(), color: colors.text },
    { label: 'Calories', value: lifetimeCalories.toLocaleString(), color: colors.text },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <GradientBackground>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>

          <Entrance preset="up" delay={30}>
            <GlassCard radius={radius.xl} padding={spacing.xl} style={styles.profileCard}>
              <View style={styles.avatar}>
                <AppText weight="display" style={styles.avatarText}>{initialsFromName(user?.name)}</AppText>
              </View>
              <AppText weight="display" style={styles.profileName}>{user?.name || 'StepFlow User'}</AppText>
              <AppText style={styles.profileSub}>{user?.email || 'Walking since January 2026'}</AppText>
              <View style={styles.profileBadges}>
                <View style={styles.badge}>
                  <LineIcon name="medal" size={15} color={colors.goal} />
                  <AppText weight="medium" style={styles.badgeText}>{earnedBadges} badges</AppText>
                </View>
                <View style={styles.badge}>
                  <LineIcon name="flame" size={15} color={colors.primary} />
                  <AppText weight="medium" style={styles.badgeText}>{streak} day streak</AppText>
                </View>
              </View>
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={70}>
            <GlassCard style={styles.card}>
              <AppText weight="medium" style={styles.cardTitle}>Lifetime stats</AppText>
              <View style={styles.lifetimeGrid}>
                {lifetimeStats.map((s, i) => (
                  <View key={i} style={styles.lifetimeStat}>
                    <AppText weight="semibold" style={[styles.lifetimeVal, { color: s.color }]}>{s.value}</AppText>
                    <AppText style={styles.lifetimeLbl}>{s.label}</AppText>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={110}>
            <GlassCard style={styles.card}>
              <AppText weight="medium" style={styles.cardTitle}>Settings</AppText>
              {settingsList.map((s, i) => (
                <PressableScale
                  key={i}
                  style={[styles.settingRow, i < settingsList.length - 1 && styles.settingBorder]}
                  onPress={
                    s.isReset ? handleResetPress :
                    s.actionType === 'goal' ? () => { setTempGoal(String(dailyGoal)); setGoalModalVisible(true); } :
                    s.actionType === 'unit' ? () => setUnitModalVisible(true) :
                    s.actionType === 'reminder' ? handleOpenTimePicker :
                    s.actionType === 'export' ? () => navigation.navigate('Export') :
                    (!s.toggle ? () => {} : undefined)
                  }
                  // Toggle rows aren't pressable themselves — the Toggle inside
                  // them is. `disabled` would stop touches reaching that child,
                  // so suppress only the row's own feedback.
                  scale={s.toggle ? 1 : 0.985}
                  haptic={s.toggle ? false : 'selection'}
                >
                  <View style={styles.settingIconContainer}>
                    <LineIcon name={s.icon} size={20} color={s.isReset ? colors.danger : colors.primary} />
                  </View>
                  <AppText style={styles.settingLabel}>{s.label}</AppText>
                  <View style={styles.settingRight}>
                    {s.toggle ? (
                      // Toggle fires its own haptic, so the explicit tapLight
                      // the Switch needed here is gone.
                      <Toggle
                        value={s.toggleKey === 'darkMode' ? isDark : toggles[s.toggleKey]}
                        onValueChange={() =>
                          s.toggleKey === 'darkMode' ? toggleTheme() : handleToggle(s.toggleKey)
                        }
                      />
                    ) : (
                      <>
                        <AppText style={styles.settingValue}>{s.value}</AppText>
                        {s.hasArrow && <AppText style={styles.arrow}>›</AppText>}
                      </>
                    )}
                  </View>
                </PressableScale>
              ))}
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={150}>
            <GlassCard style={styles.card}>
              <AppText weight="medium" style={styles.cardTitle}>Connected apps</AppText>
              {[
                { icon: AppleHealthIcon, name: 'Apple Health', connected: true },
                { icon: GoogleFitIcon, name: 'Google Fit', connected: false },
                { icon: FitbitIcon, name: 'Fitbit', connected: false },
              ].map((app, i) => (
                <View key={i} style={[styles.appRow, i < 2 && styles.settingBorder]}>
                  <View style={styles.appIconContainer}>
                    <app.icon size={22} />
                  </View>
                  <AppText style={styles.appName}>{app.name}</AppText>
                  <PressableScale style={[styles.connectBtn, app.connected && styles.connectedBtn]}>
                    <AppText weight="medium" style={[styles.connectText, app.connected && styles.connectedText]}>
                      {app.connected ? 'Connected' : 'Connect'}
                    </AppText>
                  </PressableScale>
                </View>
              ))}
            </GlassCard>
          </Entrance>

          <Entrance preset="up" delay={190}>
            <Button
              label="Sign out"
              variant="danger"
              size="lg"
              full
              onPress={() => Alert.alert('Sign out', 'Are you sure you want to sign out?',
                [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => logout() }])}
            />
          </Entrance>

        </ScrollView>
      </GradientBackground>

      {/* Goal sheet */}
      <BottomSheet visible={goalModalVisible} onClose={() => setGoalModalVisible(false)}>
        <AppText weight="displaySemi" style={styles.modalTitle}>Set Daily Step Goal</AppText>
        <AppText style={styles.modalSubtitle}>Adjust your daily target step count.</AppText>
        <TextInput
          style={styles.textInput}
          keyboardType="number-pad"
          value={tempGoal}
          onChangeText={setTempGoal}
          placeholder="e.g. 10000"
          placeholderTextColor={colors.muted}
          autoFocus
        />
        <View style={styles.modalButtons}>
          <Button label="Cancel" variant="ghost" full style={styles.modalBtn} onPress={() => setGoalModalVisible(false)} />
          <Button
            label="Save"
            full
            style={styles.modalBtn}
            onPress={() => {
              const val = parseInt(tempGoal, 10);
              if (!isNaN(val) && val > 0) { setDailyGoal(val); setGoalModalVisible(false); }
              else Alert.alert('Invalid goal', 'Please enter a valid step count.');
            }}
          />
        </View>
      </BottomSheet>

      {/* Unit sheet */}
      <BottomSheet visible={unitModalVisible} onClose={() => setUnitModalVisible(false)}>
        <AppText weight="displaySemi" style={styles.modalTitle}>Select Unit</AppText>
        <AppText style={styles.modalSubtitle}>Choose metric or imperial distance format.</AppText>
        <View style={styles.unitOptions}>
          <PressableScale style={[styles.unitCard, unit === 'Metric' && styles.unitCardSelected]} onPress={() => { setUnit('Metric'); setUnitModalVisible(false); }}>
            <AppText weight="semibold" style={[styles.unitCardTitle, unit === 'Metric' && styles.unitCardTitleSelected]}>Metric</AppText>
            <AppText style={styles.unitCardDesc}>Kilometers (km), Kilograms (kg)</AppText>
          </PressableScale>
          <PressableScale style={[styles.unitCard, unit === 'Imperial' && styles.unitCardSelected]} onPress={() => { setUnit('Imperial'); setUnitModalVisible(false); }}>
            <AppText weight="semibold" style={[styles.unitCardTitle, unit === 'Imperial' && styles.unitCardTitleSelected]}>Imperial</AppText>
            <AppText style={styles.unitCardDesc}>Miles (mi), Pounds (lbs)</AppText>
          </PressableScale>
        </View>
        <Button label="Close" variant="ghost" full style={{ marginTop: spacing.md }} onPress={() => setUnitModalVisible(false)} />
      </BottomSheet>

      {/* Time picker sheet */}
      <BottomSheet visible={timeModalVisible} onClose={() => setTimeModalVisible(false)}>
        <AppText weight="displaySemi" style={styles.modalTitle}>Reminder Time</AppText>
        <AppText style={styles.modalSubtitle}>Select when to receive your daily step reminder.</AppText>
        <View style={styles.timeSelectorContainer}>
          <View style={styles.timeColumn}>
            <PressableScale style={styles.timeAdjBtn} onPress={() => setPickerHour(h => (h === 12 ? 1 : h + 1))}>
              <AppText weight="bold" style={styles.timeAdjBtnText}>+</AppText>
            </PressableScale>
            <AppText weight="display" style={styles.timeText}>{String(pickerHour).padStart(2, '0')}</AppText>
            <PressableScale style={styles.timeAdjBtn} onPress={() => setPickerHour(h => (h === 1 ? 12 : h - 1))}>
              <AppText weight="bold" style={styles.timeAdjBtnText}>−</AppText>
            </PressableScale>
            <AppText style={styles.timeColLabel}>Hour</AppText>
          </View>
          <AppText weight="display" style={styles.timeSeparator}>:</AppText>
          <View style={styles.timeColumn}>
            <PressableScale style={styles.timeAdjBtn} onPress={() => setPickerMinute(m => (m + 5 >= 60 ? 0 : m + 5))}>
              <AppText weight="bold" style={styles.timeAdjBtnText}>+</AppText>
            </PressableScale>
            <AppText weight="display" style={styles.timeText}>{String(pickerMinute).padStart(2, '0')}</AppText>
            <PressableScale style={styles.timeAdjBtn} onPress={() => setPickerMinute(m => (m - 5 < 0 ? 55 : m - 5))}>
              <AppText weight="bold" style={styles.timeAdjBtnText}>−</AppText>
            </PressableScale>
            <AppText style={styles.timeColLabel}>Min</AppText>
          </View>
          <View style={styles.ampmColumn}>
            <PressableScale style={[styles.ampmBtn, pickerAmPm === 'AM' && styles.ampmBtnActive]} onPress={() => setPickerAmPm('AM')}>
              <AppText weight="semibold" style={[styles.ampmBtnText, pickerAmPm === 'AM' && styles.ampmBtnTextActive]}>AM</AppText>
            </PressableScale>
            <PressableScale style={[styles.ampmBtn, pickerAmPm === 'PM' && styles.ampmBtnActive]} onPress={() => setPickerAmPm('PM')}>
              <AppText weight="semibold" style={[styles.ampmBtnText, pickerAmPm === 'PM' && styles.ampmBtnTextActive]}>PM</AppText>
            </PressableScale>
          </View>
        </View>
        <View style={styles.modalButtons}>
          <Button label="Cancel" variant="ghost" full style={styles.modalBtn} onPress={() => setTimeModalVisible(false)} />
          <Button label="Save" full style={styles.modalBtn} onPress={handleSaveTimePicker} />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: TAB_BAR_CLEARANCE },

  profileCard: { alignItems: 'center', marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, borderWidth: 3, borderColor: colors.primaryDark },
  avatarText: { fontSize: 28, color: '#fff' },
  profileName: { fontSize: 22, color: colors.text, letterSpacing: -0.5 },
  profileSub: { fontSize: 12, color: colors.muted, marginTop: 4 },
  profileBadges: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 12, color: colors.textSecondary },

  card: { marginBottom: spacing.md },
  cardTitle: { fontSize: 15, color: colors.text, marginBottom: spacing.md },

  lifetimeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lifetimeStat: { width: '47%', backgroundColor: colors.glassIn, borderWidth: 1, borderColor: colors.glassBrd, borderRadius: radius.md, padding: spacing.md },
  lifetimeVal: { fontSize: 20 },
  lifetimeLbl: { fontSize: 11, color: colors.muted, marginTop: 2 },

  settingRow: { flexDirection: 'row', alignItems: 'center', height: 50, gap: 12 },
  settingBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border },
  settingIconContainer: { width: 28, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 14, color: colors.text },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settingValue: { fontSize: 13, color: colors.muted },
  arrow: { fontSize: 18, color: colors.mutedDark, marginLeft: 2 },

  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  appIconContainer: { width: 28, alignItems: 'center', justifyContent: 'center' },
  appName: { flex: 1, fontSize: 14, color: colors.text },
  connectBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.primary },
  connectedBtn: { backgroundColor: colors.primaryTint, borderColor: colors.border },
  connectText: { fontSize: 12, color: colors.primary },
  connectedText: { color: colors.muted },


  // Sheet content
  modalTitle: { fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  modalSubtitle: { fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: spacing.lg },
  textInput: { backgroundColor: colors.surface2, borderRadius: radius.md, color: colors.text, fontSize: 20, fontFamily: fonts.semibold, padding: spacing.md, textAlign: 'center', marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  modalBtn: { flex: 1 },
  unitOptions: { flexDirection: 'column', gap: spacing.md, marginBottom: spacing.sm },
  unitCard: { backgroundColor: colors.surface2, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  unitCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  unitCardTitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 4 },
  unitCardTitleSelected: { color: colors.primaryLight },
  unitCardDesc: { fontSize: 11, color: colors.muted },

  timeSelectorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderRadius: radius.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: 8 },
  timeColumn: { alignItems: 'center', width: 60 },
  timeAdjBtn: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, width: 36, height: 30, alignItems: 'center', justifyContent: 'center' },
  timeAdjBtnText: { color: colors.textSecondary, fontSize: 16 },
  timeText: { fontSize: 24, color: colors.text, marginVertical: spacing.sm },
  timeColLabel: { fontSize: 10, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  timeSeparator: { fontSize: 24, color: colors.muted, marginBottom: 16 },
  ampmColumn: { justifyContent: 'center', gap: 8, marginLeft: spacing.md },
  ampmBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', width: 50 },
  ampmBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ampmBtnText: { fontSize: 12, color: colors.textSecondary },
  ampmBtnTextActive: { color: '#fff' },
});
