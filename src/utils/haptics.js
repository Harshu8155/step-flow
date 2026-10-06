// Thin wrapper around expo-haptics.
//
// Every call is fire-and-forget and swallows errors: haptics are unavailable on
// web, on some Android devices, and whenever the user has system vibration off.
// A failed buzz must never break an interaction, so nothing here ever throws.
import * as Haptics from 'expo-haptics';

const safe = (fn) => { try { fn(); } catch (e) { /* no haptics on this device */ } };

// UI navigation: tab switches, filter chips, segmented controls.
export const tapSelection = () => safe(() => Haptics.selectionAsync());

// Ordinary button presses / toggles.
export const tapLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const tapMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

// Outcomes: goal reached, milestone unlocked, export finished, auth failed.
export const notifySuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
export const notifyWarning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
export const notifyError = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
