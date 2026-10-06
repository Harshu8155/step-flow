import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function ExportIcon({ size = 24, fillSecondary = '#FFCCBC', fillPrimary = '#FF5722', ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" {...props}>
      <Path d="M149.333333 853.333333V170.666667c0-46.933333 38.4-85.333333 85.333334-85.333334h512c46.933333 0 85.333333 38.4 85.333333 85.333334v682.666666c0 46.933333-38.4 85.333333-85.333333 85.333334H234.666667c-46.933333 0-85.333333-38.4-85.333334-85.333334z" fill={fillSecondary} />
      <Path d="M910.933333 512L682.666667 704V320z" fill={fillPrimary} />
      <Path d="M298.666667 448h490.666666v128H298.666667z" fill={fillPrimary} />
    </Svg>
  );
}
