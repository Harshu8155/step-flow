import React from 'react';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

export default function WeightIcon({ size = 24, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 508 508" {...props}>
      <Circle fill="#FD8469" cx="254" cy="254" r="254" />
      <Path fill="#F1543F" d="M63.7,422.1C110.2,474.8,178.2,508,254,508s143.8-33.2,190.3-85.9H63.7z" />
      <Path fill="#FFD05B" d="M290.4,377.4H131.5c-1,0-1.9-0.8-1.9-1.9V216.7c0-1,0.8-1.9,1.9-1.9h158.9c1,0,1.9,0.8,1.9,1.9v158.9 C292.3,376.6,291.4,377.4,290.4,377.4z" />
      <Rect x="188.2" y="214.8" fill="#FFFFFF" width="45.5" height="17.9" />
      <Path fill="#F9B54C" d="M236.4,263.8h-50.8c-3.6,0-6.5-2.9-6.5-6.5l0,0c0-3.6,2.9-6.5,6.5-6.5h50.8c3.6,0,6.5,2.9,6.5,6.5 l0,0C242.8,260.9,239.9,263.8,236.4,263.8z" />
      <Rect x="312.4" y="163.1" fill="#E6E9EE" width="15.5" height="223.7" />
      <Path fill="#324A5E" d="M400.2,403.3H107.8c-0.7,0-1.2-0.5-1.2-1.2v-23.5c0-0.7,0.5-1.2,1.2-1.2h292.3c0.7,0,1.2,0.5,1.2,1.2 v23.5C401.4,402.8,400.8,403.3,400.2,403.3z" />
      <G>
        <Path fill="#2B3B4E" d="M378.3,403.3h-39.4v16.3c0,0.3,0.2,0.5,0.5,0.5h38.4c0.3,0,0.5-0.2,0.5-0.5V403.3z" />
        <Path fill="#2B3B4E" d="M169.1,403.3h-39.4v16.3c0,0.3,0.2,0.5,0.5,0.5h38.4c0.3,0,0.5-0.2,0.5-0.5V403.3z" />
      </G>
      <Path fill="#324A5E" d="M373.2,167.5H267c-0.7,0-1.2-0.5-1.2-1.2V85c0-0.7,0.5-1.2,1.2-1.2h106.2c0.7,0,1.2,0.5,1.2,1.2v81.3 C374.4,166.9,373.9,167.5,373.2,167.5z" />
      <Rect x="273.2" y="92.9" fill="#84DBFF" width="93.9" height="33.3" />
      <G>
        <Rect x="273.2" y="132" fill="#CED5E0" width="9.7" height="9.7" />
        <Rect x="288.4" y="132" fill="#CED5E0" width="9.7" height="9.7" />
        <Rect x="303.6" y="132" fill="#CED5E0" width="9.7" height="9.7" />
        <Rect x="318.8" y="132" fill="#CED5E0" width="9.7" height="9.7" />
        <Rect x="273.2" y="147.2" fill="#CED5E0" width="9.7" height="9.7" />
        <Rect x="288.4" y="147.2" fill="#CED5E0" width="9.7" height="9.7" />
        <Rect x="303.6" y="147.2" fill="#CED5E0" width="9.7" height="9.7" />
        <Rect x="318.8" y="147.2" fill="#CED5E0" width="9.7" height="9.7" />
      </G>
    </Svg>
  );
}
