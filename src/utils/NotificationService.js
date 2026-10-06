import * as Notifications from 'expo-notifications';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // `shouldShowAlert` was split into banner/list when notifications moved to
    // the newer iOS presentation API; it still works but is deprecated.
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests push notification permissions from the user.
 * @returns {Promise<boolean>} True if permissions are granted.
 */
export async function requestPermissionsAsync() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedules a daily recurring local notification.
 * Cancels all previous scheduled notifications first to avoid duplicates.
 * 
 * @param {number} hour - Hour in 24h format (0 - 23)
 * @param {number} minute - Minute (0 - 59)
 * @returns {Promise<string|null>} The notification identifier string or null.
 */
export async function scheduleDailyReminder(hour, minute) {
  try {
    // Clear all previously scheduled reminders to prevent duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: '👟 Time for a step check!',
        body: "Let's check your progress and hit your daily step goal today!",
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });
    
    console.log(`Scheduled daily reminder successfully for ${hour}:${String(minute).padStart(2, '0')}. ID: ${identifier}`);
    return identifier;
  } catch (error) {
    console.warn('Error scheduling daily reminder:', error);
    return null;
  }
}

/**
 * Cancels all scheduled local notifications.
 */
export async function cancelAllReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications successfully cancelled.');
  } catch (error) {
    console.warn('Error cancelling scheduled reminders:', error);
  }
}
