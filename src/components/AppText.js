// AppText — Text with the app's default body font (Plus Jakarta Sans) applied,
// so we don't repeat fontFamily everywhere. Weight helpers via the `weight` prop.
import React from 'react';
import { Text } from 'react-native';
import { fonts } from '../theme';

const WEIGHTS = {
  regular: fonts.regular,
  medium: fonts.medium,
  semibold: fonts.semibold,
  bold: fonts.bold,
  display: fonts.display,
  displayExtra: fonts.displayExtra,
  displaySemi: fonts.displaySemi,
};

export function AppText({ weight = 'regular', style, children, ...rest }) {
  return (
    <Text {...rest} style={[{ fontFamily: WEIGHTS[weight] || fonts.regular }, style]}>
      {children}
    </Text>
  );
}

export default AppText;
