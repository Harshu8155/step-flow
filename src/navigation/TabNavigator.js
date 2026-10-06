import React from 'react';
import { View, StyleSheet } from 'react-native';
import Reanimated, {
  LinearTransition, FadeIn, FadeOut,
  useSharedValue, useAnimatedStyle, withTiming, Easing as ReanimatedEasing,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { radius, spacing, fonts } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { AppText, LineIcon, PressableScale, LiquidGlassBar } from '../components';
import { withAlpha } from '../components/LiquidGlassBar';

import HomeScreen from '../screens/HomeScreen';
import WeeklyScreen from '../screens/WeeklyScreen';
import StatsScreen from '../screens/StatsScreen';
import MilestonesScreen from '../screens/MilestonesScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createMaterialTopTabNavigator();

const TAB_LABELS = { Home: 'Dashboard', Weekly: 'Weekly', Stats: 'Progress', Milestones: 'Badges', Profile: 'Profile' };
const TAB_ICONS = { Home: 'home', Weekly: 'calendar', Stats: 'chart', Milestones: 'trophy', Profile: 'user' };

// The label width morph is a layout change, which RN's Animated can't drive on
// the native driver. This used to be LayoutAnimation, but that is a no-op under
// the New Architecture (it warns and the pill snaps instead of morphing), so
// Reanimated's layout transitions do the work now — same effect, and they run
// on the UI thread on both architectures.
const MORPH = LinearTransition.duration(260);

// `position` comes from react-native-tab-view: a continuous 0..n-1 offset that
// tracks the finger through a swipe. LiquidGlassBar deforms off it.
function CustomTabBar({ state, navigation, position }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // No effect needed any more: each item carries its own `layout` transition, so
  // the morph runs whenever the focused tab changes — including on a swipe.

  return (
    <View
      style={[
        styles.wrap,
        // The bar floats clear of the screen edge, so it needs the inset as
        // outer margin rather than inner padding.
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
      pointerEvents="box-none"
    >
      <LiquidGlassBar position={position} index={state.index} style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            // The width morph lives on this wrapper rather than on the
            // touchable: `layout` animates the flexGrow change between the
            // icon-sized and pill-sized states.
            <Reanimated.View
              key={route.key}
              layout={MORPH}
              style={isFocused ? styles.itemActive : styles.item}
            >
              <PressableScale
                onPress={onPress}
                haptic="selection"
                scale={0.94}
                style={[styles.itemInner, isFocused && styles.pill]}
              >
                <LineIcon
                  name={TAB_ICONS[route.name]}
                  size={20}
                  color={isFocused ? colors.primary : colors.tabBarIdle}
                  strokeWidth={1.9}
                />
                {isFocused && (
                  <Reanimated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                    <AppText weight="semibold" style={styles.label} numberOfLines={1}>
                      {TAB_LABELS[route.name] || route.name}
                    </AppText>
                  </Reanimated.View>
                )}
              </PressableScale>
            </Reanimated.View>
          );
        })}
      </LiquidGlassBar>
    </View>
  );
}

// withFadeIn — a short opacity lift whenever a tab gains focus.
//
// The pager's own slide stays disabled (see `animationEnabled` below): jumping
// Home -> Profile scrolls through every screen in between, which flashes. But
// with it off the switch was completely inert, so the arriving screen fades
// itself in instead. Cheap, native-driven, and unaffected by how far you jumped.
function withFadeIn(Screen) {
  return function FadedScene(props) {
    const isFocused = useIsFocused();
    // Reanimated, not RN's Animated: under Fabric the native-driver timing this
    // used to run never advanced, so every screen sat at the 0.4 it was dropped
    // to and the whole app rendered washed out.
    const opacity = useSharedValue(1);

    React.useEffect(() => {
      if (!isFocused) return;
      opacity.value = 0.4;
      opacity.value = withTiming(1, { duration: 200, easing: ReanimatedEasing.out(ReanimatedEasing.quad) });
    }, [isFocused, opacity]);

    const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

    return (
      <Reanimated.View style={[{ flex: 1 }, fade]}>
        <Screen {...props} />
      </Reanimated.View>
    );
  };
}

// Built once at module scope — wrapping inside render would remount every screen
// (and re-run its data fetches) on each tab change.
const Screens = {
  Home: withFadeIn(HomeScreen),
  Weekly: withFadeIn(WeeklyScreen),
  Stats: withFadeIn(StatsScreen),
  Milestones: withFadeIn(MilestonesScreen),
  Profile: withFadeIn(ProfileScreen),
};

export default function TabNavigator() {
  const { colors } = useTheme();
  return (
    // Top edge only — the tab bar handles the bottom inset itself, and it floats
    // above the content rather than sitting in its own row.
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tab.Navigator
        tabBarPosition="bottom"
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          tabBarIndicatorStyle: { height: 0 },
          swipeEnabled: true,
          lazy: true,
          // The pager scrolls THROUGH every intermediate screen when you jump
          // Home -> Profile, which reads as a choppy flash of the screens in
          // between. Disabling it makes taps switch instantly; withFadeIn above
          // supplies the transition. Swiping still tracks the finger normally.
          animationEnabled: false,
        }}
      >
        <Tab.Screen name="Home" component={Screens.Home} />
        <Tab.Screen name="Weekly" component={Screens.Weekly} />
        <Tab.Screen name="Stats" component={Screens.Stats} />
        <Tab.Screen name="Milestones" component={Screens.Milestones} />
        <Tab.Screen name="Profile" component={Screens.Profile} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  // Transparent gutter so screen content scrolls visibly beneath the floating bar.
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  // Surface, rim, blur and shadow all live in LiquidGlassBar now — what stays
  // here is only the row the tabs lay out in.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    padding: 6,
    marginHorizontal: spacing.lg,
  },
  // Inactive tabs shrink to an icon; the active one takes the slack, which is
  // what produces the wide white pill.
  item: { flexGrow: 0 },
  itemActive: { flexGrow: 1, flexShrink: 1 },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 14,
  },
  // Slightly see-through so the active tab reads as a second, denser drop
  // floating inside the first. Held at 0.9 — the label has to stay legible over
  // whatever the screen happens to be scrolling underneath.
  pill: {
    backgroundColor: withAlpha(colors.tabBarActive, 0.9),
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 13,
    color: colors.tabBarActiveText,
    marginLeft: 8,
    letterSpacing: -0.2,
  },
});
