// useRefreshControl — the app's standard pull-to-refresh.
//
// Users reflexively pull down on a step tracker to make it re-check the sensor,
// and until now nothing happened. Returns props to spread onto a ScrollView.
//
// The spinner is held for a minimum beat: a refresh that resolves in 40ms just
// flickers, which reads as "nothing happened" rather than as a completed sync.
import React, { useState, useCallback } from 'react';
import { RefreshControl } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useSteps } from './StepContext';
import { tapLight } from './haptics';

const MIN_SPIN_MS = 600;

export default function useRefreshControl() {
  const { colors } = useTheme();
  const { refresh } = useSteps();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const started = Date.now();
    try {
      await refresh?.();
    } finally {
      const elapsed = Date.now() - started;
      setTimeout(() => {
        setRefreshing(false);
        tapLight();
      }, Math.max(0, MIN_SPIN_MS - elapsed));
    }
  }, [refresh]);

  return {
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={colors.primary}
        colors={[colors.primary]}
        progressBackgroundColor={colors.surface}
      />
    ),
    refreshing,
  };
}
