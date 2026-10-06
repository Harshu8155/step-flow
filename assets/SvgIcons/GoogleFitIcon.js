import React from 'react';
import Svg, { Path, Line, Polyline } from 'react-native-svg';

export default function GoogleFitIcon({ size = 24, ...props }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" {...props}>
      <Path fill="none" stroke="#4285f4" strokeMiterlimit="10" strokeWidth="4" d="M19.3588,8.2469a5,5,0,0,1,7.071,0h0a5,5,0,0,1,0,7.071l-1.7677,1.7678" />
      <Line x1="19.712" x2="14.763" y1="7.893" y2="12.843" fill="none" stroke="#4285f4" strokeMiterlimit="10" strokeWidth="4" />
      <Path fill="none" stroke="#ea4435" strokeMiterlimit="10" strokeWidth="4" d="M14.7626,10.0147,12.6412,7.8934a5,5,0,0,0-7.071,0h0a5,5,0,0,0,0,7.0711l2.1213,2.1213" />
      <Line x1="7.691" x2="14.763" y1="19.914" y2="12.843" fill="none" stroke="#fbc02d" strokeMiterlimit="10" strokeWidth="4" />
      <Polyline fill="none" stroke="#00ac47" strokeMiterlimit="10" strokeWidth="4" points="24.662 17.086 16.177 25.571 10.52 19.914" />
    </Svg>
  );
}
