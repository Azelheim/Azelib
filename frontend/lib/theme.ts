import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { Platform } from 'react-native';

export const azelheimLight = {
  bg: '#FAFAF9',
  card: '#FFFFFF',
  surface: '#F5F5F4',
  border: '#1C1917',
  line: '#E7E5E4',
  text: '#1C1917',
  muted: '#78716C',
  faint: '#A8A29E',
  grid: '#E7E5E4',
  purple: '#F3EEFF',
  green: '#E6F8EE',
  red: '#FEE2E2',
  blue: '#E8F2FF',
  amber: '#FEF3C7',
  danger: '#DC2626',
  panel: '#EEF0F1',
};

export const azelheimDark = {
  bg: '#09090B',
  card: '#121215',
  surface: '#18181B',
  border: '#27272A',
  line: '#1E1E22',
  text: '#FAFAFA',
  muted: '#A1A1AA',
  faint: '#52525B',
  grid: '#1F1F24',
  purple: '#23153D',
  green: '#072918',
  red: '#380C0C',
  blue: '#0B2245',
  amber: '#382506',
  danger: '#EF4444',
  panel: '#111217',
};

export type AzelheimColors = typeof azelheimLight;

export const fontConfig = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
};

export const getPaperTheme = (isDark: boolean) => {
  const c = isDark ? azelheimDark : azelheimLight;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.text,
      onPrimary: c.bg,
      primaryContainer: c.surface,
      onPrimaryContainer: c.text,
      secondary: c.muted,
      onSecondary: c.card,
      background: c.bg,
      surface: c.card,
      surfaceVariant: c.surface,
      error: c.danger,
      onError: '#FFFFFF',
      errorContainer: c.red,
      onErrorContainer: c.danger,
      outline: c.border,
      outlineVariant: c.line,
      elevation: {
        level0: 'transparent',
        level1: c.card,
        level2: c.card,
        level3: c.card,
        level4: c.card,
        level5: c.card,
      },
    },
    roundness: 1, // 4px micro-radius
    fonts: configureFonts({ config: fontConfig }),
    mode: 'exact' as const,
  };
};

export const theme = getPaperTheme(false);

interface ThemeContextType {
  isDark: boolean;
  colors: AzelheimColors;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  colors: azelheimLight,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function AzelheimThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const colors = useMemo(() => (isDark ? azelheimDark : azelheimLight), [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const setThemeMode = (mode: 'light' | 'dark') => {
    setIsDark(mode === 'dark');
  };

  return React.createElement(
    ThemeContext.Provider,
    { value: { isDark, colors, toggleTheme, setThemeMode } },
    children
  );
}

export function useAzelheimTheme() {
  return useContext(ThemeContext);
}
