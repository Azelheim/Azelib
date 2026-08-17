import { MD3LightTheme, configureFonts } from 'react-native-paper';

// Minimalist color palette
const colors = {
  ...MD3LightTheme.colors,
  primary: '#000000',      // Solid black as primary for stark, minimal look
  onPrimary: '#FFFFFF',
  primaryContainer: '#F0F0F0',
  onPrimaryContainer: '#000000',
  
  secondary: '#333333',
  onSecondary: '#FFFFFF',
  
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  
  error: '#D32F2F',        // Red for error
  onError: '#FFFFFF',
  errorContainer: '#FDECEA',
  onErrorContainer: '#D32F2F',

  // Status/Accent
  success: '#388E3C',      // Green
  warning: '#F57C00',      // Orange
  
  outline: '#E0E0E0',
  outlineVariant: '#EEEEEE',
  
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#FFFFFF',
    level3: '#FFFFFF',
    level4: '#FFFFFF',
    level5: '#FFFFFF',
  }
};

const fontConfig = {
  fontFamily: 'System', // use default system sans-serif font
}

export const theme = {
  ...MD3LightTheme,
  colors: colors,
  roundness: 1, // Slight rounded corners, not fully pill/square
  fonts: configureFonts({config: fontConfig}),
  // Override shadow to be flat
  mode: 'exact' as const,
};
