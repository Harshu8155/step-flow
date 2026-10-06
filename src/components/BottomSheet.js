// BottomSheet — modal content that slides up from the bottom with a fading,
// blurred backdrop. Replaces the centered <Modal> dialogs in the redesign.
// Tap the backdrop to dismiss.
import React, { useRef, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableWithoutFeedback, Animated, Easing, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, shadows } from '../theme';

export default function BottomSheet({ visible, onClose, children }) {
  const { colors, isDark } = useTheme();
  const { height } = Dimensions.get('window');
  const slide = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 400, easing: Easing.bezier(0.22, 0.61, 0.36, 1), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(height);
      fade.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
            <BlurView intensity={12} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,12,30,0.5)' }]} />
          </Animated.View>
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            shadows.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ translateY: slide }] },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
