import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

export default function MoonIcon({ size = 24, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" {...props}>
      <G id="moon-phase-7" transform="translate(-2 -2)">
        <Path id="secondary" fill="#2ca9bc" d="M21,12a9,9,0,0,1-9,9V3a9,9,0,0,1,9,9Z" />
        <Circle id="primary" cx="9" cy="9" r="9" transform="translate(3 3)" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <Path id="primary-2" data-name="primary" d="M21,12a9,9,0,0,1-9,9V3a9,9,0,0,1,9,9Z" fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </G>
    </Svg>
  );
}
