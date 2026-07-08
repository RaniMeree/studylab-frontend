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
};

const dark = {
  page: '#101012',
  card: '#1B1B1F',
  cardAlt: '#242429',
  border: '#2E2E34',
  text: '#F2F1EE',
  textSecondary: '#A7A5A0',
  textMuted: '#6E6C67',
  accent: '#8B84F2',
  accentSoft: '#2A2843',
  onAccent: '#101012',
  success: '#4ADE80',
  successSoft: '#173323',
  danger: '#F87171',
  dangerSoft: '#3A1D1D',
  warn: '#FBBF24',
  warnSoft: '#3A2E14',
};

export const palettes = { light, dark };

export const ThemeContext = createContext(light);

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
