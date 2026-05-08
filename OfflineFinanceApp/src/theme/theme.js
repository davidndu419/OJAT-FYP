import {Platform} from 'react-native';
import {MD3LightTheme} from 'react-native-paper';

export const COLORS = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  primary: '#1f3a5f',
  primaryDark: '#13243d',
  primarySoft: '#e8eef7',
  primaryPale: '#f3f7fb',
  primaryForeground: '#ffffff',
  accent: '#2563eb',
  secondary: '#f1f5f9',
  text: '#111827',
  muted: '#667085',
  line: '#e2e8f0',
  success: '#12a66a',
  successAlt: '#35d39b',
  successSoft: '#e7f8ef',
  danger: '#dc3f2f',
  dangerSoft: '#fff1ed',
  warning: '#e6a122',
  warningSoft: '#fff7df',
  glass: 'rgba(255,255,255,0.18)',
  glassStrong: 'rgba(255,255,255,0.2)',
};

export const GRADIENTS = {
  primary: [COLORS.primary, COLORS.accent],
  success: [COLORS.success, COLORS.successAlt],
  sunrise: [COLORS.warning, COLORS.danger],
};

export const WEB_GRADIENTS = {
  primary: `linear-gradient(135deg, ${GRADIENTS.primary[0]} 0%, ${GRADIENTS.primary[1]} 100%)`,
  success: `linear-gradient(135deg, ${GRADIENTS.success[0]} 0%, ${GRADIENTS.success[1]} 100%)`,
  sunrise: `linear-gradient(135deg, ${GRADIENTS.sunrise[0]} 0%, ${GRADIENTS.sunrise[1]} 100%)`,
};

export const FONT_FAMILY = Platform.select({
  ios: 'Plus Jakarta Sans',
  android: 'sans-serif',
  web: '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  default: undefined,
});

const fontConfig = {
  fontFamily: FONT_FAMILY,
};

export const APP_THEME = {
  ...MD3LightTheme,
  roundness: 16,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    onPrimary: COLORS.surface,
    primaryContainer: COLORS.primarySoft,
    onPrimaryContainer: COLORS.primaryDark,
    secondary: COLORS.primary,
    background: COLORS.background,
    surface: COLORS.surface,
    surfaceVariant: COLORS.primaryPale,
    outline: COLORS.line,
    error: COLORS.danger,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    default: fontConfig,
    displayLarge: {...MD3LightTheme.fonts.displayLarge, ...fontConfig},
    displayMedium: {...MD3LightTheme.fonts.displayMedium, ...fontConfig},
    displaySmall: {...MD3LightTheme.fonts.displaySmall, ...fontConfig},
    headlineLarge: {...MD3LightTheme.fonts.headlineLarge, ...fontConfig},
    headlineMedium: {...MD3LightTheme.fonts.headlineMedium, ...fontConfig},
    headlineSmall: {...MD3LightTheme.fonts.headlineSmall, ...fontConfig},
    titleLarge: {...MD3LightTheme.fonts.titleLarge, ...fontConfig},
    titleMedium: {...MD3LightTheme.fonts.titleMedium, ...fontConfig},
    titleSmall: {...MD3LightTheme.fonts.titleSmall, ...fontConfig},
    bodyLarge: {...MD3LightTheme.fonts.bodyLarge, ...fontConfig},
    bodyMedium: {...MD3LightTheme.fonts.bodyMedium, ...fontConfig},
    bodySmall: {...MD3LightTheme.fonts.bodySmall, ...fontConfig},
    labelLarge: {...MD3LightTheme.fonts.labelLarge, ...fontConfig},
    labelMedium: {...MD3LightTheme.fonts.labelMedium, ...fontConfig},
    labelSmall: {...MD3LightTheme.fonts.labelSmall, ...fontConfig},
  },
};

export const softShadow = {
  elevation: 2,
  shadowColor: COLORS.primaryDark,
  shadowOffset: {width: 0, height: 8},
  shadowOpacity: 0.08,
  shadowRadius: 18,
};

export const cardShadow = {
  elevation: 3,
  shadowColor: COLORS.primaryDark,
  shadowOffset: {width: 0, height: 10},
  shadowOpacity: 0.12,
  shadowRadius: 22,
};

export const popShadow = {
  elevation: 8,
  shadowColor: COLORS.primary,
  shadowOffset: {width: 0, height: 16},
  shadowOpacity: 0.3,
  shadowRadius: 28,
};

export const glowShadow = {
  elevation: 6,
  shadowColor: COLORS.primary,
  shadowOffset: {width: 0, height: 10},
  shadowOpacity: 0.34,
  shadowRadius: 22,
};
