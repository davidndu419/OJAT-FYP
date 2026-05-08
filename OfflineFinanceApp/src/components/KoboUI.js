import React from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {COLORS, FONT_FAMILY, WEB_GRADIENTS, cardShadow, glowShadow, popShadow} from '../theme/theme';

export const gradientStyle = variant =>
  Platform.select({
    web: {
      backgroundImage: WEB_GRADIENTS[variant || 'primary'],
    },
    default: {
      backgroundColor:
        variant === 'success'
          ? COLORS.success
          : variant === 'sunrise'
          ? COLORS.warning
          : COLORS.primary,
    },
  });

export const Screen = ({children, scrollStyle}) => (
  <View style={styles.screen}>
    <View style={[styles.screenInner, scrollStyle]}>{children}</View>
  </View>
);

export const ScreenHeader = ({eyebrow, title, subtitle}) => (
  <View style={styles.header}>
    <Text style={styles.eyebrow}>{eyebrow}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

export const SurfaceCard = ({children, style}) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const HeroCard = ({children, variant = 'primary', style}) => (
  <View style={[styles.hero, gradientStyle(variant), style]}>
    <View style={styles.heroGlow} />
    {children}
  </View>
);

export const IconBubble = ({
  children,
  tone = 'primary',
  gradient = false,
  size = 44,
  style,
}) => (
  <View
    style={[
      styles.iconBubble,
      {
        width: size,
        height: size,
        borderRadius: Math.max(16, size / 2.6),
        backgroundColor: getSoftTone(tone),
      },
      gradient && [gradientStyle(tone === 'success' ? 'success' : 'primary'), glowShadow],
      style,
    ]}>
    {children}
  </View>
);

export const KoboButton = ({children, onPress, disabled, loading, style}) => (
  <TouchableOpacity
    activeOpacity={0.86}
    disabled={disabled || loading}
    onPress={onPress}
    style={[
      styles.button,
      gradientStyle('primary'),
      glowShadow,
      (disabled || loading) && styles.disabled,
      style,
    ]}>
    <Text style={styles.buttonText}>{loading ? 'Please wait...' : children}</Text>
  </TouchableOpacity>
);

export const KoboInput = props => (
  <TextInput
    placeholderTextColor={COLORS.muted}
    {...props}
    style={[styles.input, props.style]}
  />
);

export const EmptyState = ({icon, title, text}) => (
  <View style={styles.emptyState}>
    <IconBubble tone="muted">{icon}</IconBubble>
    {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

export const getToneColor = tone => {
  if (tone === 'success') {
    return COLORS.success;
  }
  if (tone === 'danger') {
    return COLORS.danger;
  }
  if (tone === 'warning') {
    return COLORS.warning;
  }
  if (tone === 'muted') {
    return COLORS.muted;
  }
  return COLORS.primary;
};

const getSoftTone = tone => {
  if (tone === 'success') {
    return COLORS.successSoft;
  }
  if (tone === 'danger') {
    return COLORS.dangerSoft;
  }
  if (tone === 'warning') {
    return COLORS.warningSoft;
  }
  if (tone === 'muted') {
    return COLORS.secondary;
  }
  return COLORS.primarySoft;
};

export const type = StyleSheet.create({
  number: {
    fontFamily: FONT_FAMILY,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
  },
  screenInner: {
    maxWidth: 448,
    width: '100%',
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  eyebrow: {
    color: COLORS.primary,
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 38,
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  card: {
    ...cardShadow,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  hero: {
    ...popShadow,
    borderRadius: 28,
    overflow: 'hidden',
    padding: 20,
  },
  heroGlow: {
    backgroundColor: COLORS.glass,
    borderRadius: 90,
    height: 170,
    position: 'absolute',
    right: -55,
    top: -68,
    width: 170,
  },
  iconBubble: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: COLORS.primaryForeground,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.58,
  },
  input: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.line,
    borderRadius: 18,
    borderWidth: 1,
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 22,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: FONT_FAMILY,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyText: {
    color: COLORS.muted,
    fontFamily: FONT_FAMILY,
    lineHeight: 20,
    marginTop: 4,
    textAlign: 'center',
  },
});
