// LineIcon — a small, clean, timeless line-icon set (single stroke, currentColor)
// used for milestones / records / profile badges in the redesign.
// Replaces the emoji glyphs. Add new icons by dropping a path string into PATHS.
import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const PATHS = {
  medal: 'M8.5 3 11 9 M15.5 3 13 9 M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z M12 12.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3.9-1.9Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z M12 12h.01',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 1.5 2S12 8 12 3Z',
  shoe: 'M3 16v-4l3-1 2-3 3 3c3 1 6 1.5 8.5 2 .8.2 1.5.9 1.5 1.8V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z M6 12v3',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0V4Z M7 6H4v1a3 3 0 0 0 3 3 M17 6h3v1a3 3 0 0 1-3 3 M9 15h6 M10 15v3h4v-3 M8 21h8',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3 12h18 M12 3a13 13 0 0 1 0 18 M12 3a13 13 0 0 0 0 18',
  mountain: 'M3 19h18L14 6l-3 5-2-2-6 10Z',
  diamond: 'M5 8h14l-7 12L5 8Z M5 8l3-4h8l3 4 M9.5 8 12 20 M14.5 8 12 20',
  // settings glyphs
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7.5v5l3.5 2',
  ruler: 'M4 9h16v6H4z M8 9v3 M12 9v4 M16 9v3',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M10.3 21a2 2 0 0 0 3.4 0',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  upload: 'M12 16V4 M7.5 8.5 12 4l4.5 4.5 M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3',
  refresh: 'M20.5 12a8.5 8.5 0 1 1-2.4-5.9 M20.5 3.5v4h-4',
  // export / navigation glyphs
  download: 'M12 4v12 M7.5 11.5 12 16l4.5-4.5 M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3',
  check: 'M5 12.5 9.5 17 19 7',
  'chevron-left': 'M15 4.5 7.5 12l7.5 7.5',
  // tab-bar glyphs
  home: 'M3 11l9-7 9 7 M5 9.5V20h14V9.5 M9.5 20v-6h5v6',
  calendar: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6Z M4 9.5h16 M8 3v4 M16 3v4',
  chart: 'M4 20h16 M7.5 20v-6 M12 20v-10 M16.5 20v-13',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 20.5a7.5 7.5 0 0 1 15 0',
  // quick-action glyphs (dashboard shortcut row)
  dumbbell: 'M4 9v6 M7 7v10 M17 7v10 M20 9v6 M7 12h10',
  meal: 'M6 3v8a2 2 0 0 0 4 0V3 M8 11v10 M16 3c-1.5 1.5-2 3-2 5s.5 3 2 3v10',
  water: 'M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z',
  sync: 'M20 11a8 8 0 0 0-14.3-4.9 M4 13a8 8 0 0 0 14.3 4.9 M4 4.5v4h4 M20 19.5v-4h-4',
  plus: 'M12 5v14 M5 12h14',
  heart: 'M12 20.3 4.3 12.6a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9a4.8 4.8 0 0 1 6.8 6.8L12 20.3Z',
  pulse: 'M3 12h4l2.5-6 4 13 2.5-7h5',
};

export default function LineIcon({ name, size = 20, color = '#000', strokeWidth = 1.6 }) {
  const d = PATHS[name];
  if (!d) return null;
  // Split combined path data into separate subpaths so each renders cleanly.
  const subpaths = d.split(' M').map((s, i) => (i === 0 ? s : 'M' + s));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {subpaths.map((p, i) => (
        <Path
          key={i}
          d={p}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
