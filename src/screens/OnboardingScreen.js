import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions, SafeAreaView, StatusBar,
} from 'react-native';
import { PressableScale, AppText, Button } from '../components';
import { spacing, radius, fonts } from '../theme';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

const buildSlides = (colors) => [
  {
    id: '1',
    icon: '🏃',
    title: 'Track Every Step',
    desc: 'Automatically count your daily steps with accurate step detection running in the background.',
    accent: colors.primary,
  },
  {
    id: '2',
    icon: '📊',
    title: 'Beautiful Insights',
    desc: 'Weekly, monthly, and yearly charts that show your fitness journey at a glance.',
    accent: colors.accent,
  },
  {
    id: '3',
    icon: '🏆',
    title: 'Earn Milestones',
    desc: 'Unlock badges and celebrate your achievements as you hit new personal records.',
    accent: colors.goal,
  },
];

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const SLIDES = useMemo(() => buildSlides(colors), [colors]);

  const next = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(i => i + 1);
    } else {
      navigation.replace('MainTabs');
    }
  };

  const skip = () => navigation.replace('MainTabs');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Skip */}
      <PressableScale style={styles.skipBtn} onPress={skip}>
        <AppText style={styles.skipText}>Skip</AppText>
      </PressableScale>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={s => s.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconCircle, { borderColor: item.accent }]}>
              <AppText style={styles.slideIcon}>{item.icon}</AppText>
            </View>
            <AppText style={styles.slideTitle}>{item.title}</AppText>
            <AppText style={styles.slideDesc}>{item.desc}</AppText>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex
                ? [styles.dotActive, { backgroundColor: SLIDES[currentIndex].accent }]
                : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <Button
        label={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
        onPress={next}
        size="lg"
        full
        style={styles.cta}
      />

    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, paddingBottom: spacing.xl },
  skipBtn: { alignSelf: 'flex-end', padding: spacing.lg },
  skipText: { fontSize: 14, color: colors.muted },

  // Slide
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, marginBottom: spacing.xxl,
  },
  slideIcon: { fontSize: 52 },
  slideTitle: { fontSize: 28, fontFamily: fonts.display, color: colors.text, textAlign: 'center', marginBottom: spacing.lg },
  slideDesc: { fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 24 },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.xl },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24 },
  dotInactive: { width: 6, backgroundColor: colors.surface2 },

  // CTA
  cta: {
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  ctaText: { fontSize: 16, fontFamily: fonts.semibold, color: '#fff' },
});
