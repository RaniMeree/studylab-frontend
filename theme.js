import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const light = {
  page: '#F7F6F3',
  card: '#FFFFFF',
  cardAlt: '#F1EFEA',
  border: '#E4E2DC',
  text: '#1A1A17',
  textSecondary: '#6B6A64',
  textMuted: '#9C9A92',
  accent: '#4F46E5',
  accentSoft: '#EEEDFC',
  onAccent: '#FFFFFF',
  success: '#15803D',
  successSoft: '#E8F4EA',
  danger: '#DC2626',
  dangerSoft: '#FDEBEB',
  warn: '#B45309',
  warnSoft: '#FBF0DC',
  glass: false,
};

// Neon Glass dark theme
const dark = {
  page: '#0D0221',
  card: '#130A2A',
  cardAlt: '#1A0F35',
  border: '#3D2A7A',
  borderGlass: 'rgba(167,139,250,0.22)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.38)',
  accent: '#A78BFA',
  accentBright: '#7C3AED',
  accentSoft: 'rgba(124,58,237,0.18)',
  onAccent: '#FFFFFF',
  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.15)',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.15)',
  warn: '#FBBF24',
  warnSoft: 'rgba(251,191,36,0.15)',
  cyan: '#22D3EE',
  pink: '#F472B6',
  glass: true,
};

export const palettes = { light, dark };

export const ThemeContext = createContext(dark);

export function useThemeColors() {
  return useContext(ThemeContext);
}

// pref: 'system' | 'light' | 'dark'
export function usePalette(pref = 'system') {
  const scheme = useColorScheme();
  if (pref === 'light') return light;
  if (pref === 'dark') return dark;
  return scheme === 'dark' ? dark : light;
}
