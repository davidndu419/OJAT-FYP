import React from 'react';
import {Text} from 'react-native';

const glyphs = {
  ArrowRight: '→',
  ArrowUpRight: '↗',
  BarChart3: '▥',
  Bell: '◦',
  Check: '✓',
  CheckCircle2: '✓',
  ChevronDown: '⌄',
  ChevronLeft: '‹',
  ChevronRight: '›',
  CreditCard: '▰',
  Eye: '◉',
  EyeOff: '⊘',
  LayoutGrid: '▦',
  Lock: '⌑',
  Mail: '✉',
  Minus: '-',
  Package: '□',
  Plus: '+',
  RefreshCw: '↻',
  Save: '✓',
  Search: '⌕',
  ShieldCheck: '◇',
  ShoppingBag: '▱',
  Sparkles: '✦',
  Star: '★',
  TrendingUp: '↗',
  User: '○',
  Wallet: '▭',
  Wifi: '≋',
};

const makeIcon = name => ({color, size = 20, style, onPress}) => (
  <Text
    onPress={onPress}
    style={[
      {
        color,
        fontSize: size,
        fontWeight: '800',
        lineHeight: size + 2,
        textAlign: 'center',
      },
      style,
    ]}>
    {glyphs[name]}
  </Text>
);

export const ArrowRight = makeIcon('ArrowRight');
export const ArrowUpRight = makeIcon('ArrowUpRight');
export const BarChart3 = makeIcon('BarChart3');
export const Bell = makeIcon('Bell');
export const Check = makeIcon('Check');
export const CheckCircle2 = makeIcon('CheckCircle2');
export const ChevronDown = makeIcon('ChevronDown');
export const ChevronLeft = makeIcon('ChevronLeft');
export const ChevronRight = makeIcon('ChevronRight');
export const CreditCard = makeIcon('CreditCard');
export const Eye = makeIcon('Eye');
export const EyeOff = makeIcon('EyeOff');
export const LayoutGrid = makeIcon('LayoutGrid');
export const Lock = makeIcon('Lock');
export const Mail = makeIcon('Mail');
export const Minus = makeIcon('Minus');
export const Package = makeIcon('Package');
export const Plus = makeIcon('Plus');
export const RefreshCw = makeIcon('RefreshCw');
export const Save = makeIcon('Save');
export const Search = makeIcon('Search');
export const ShieldCheck = makeIcon('ShieldCheck');
export const ShoppingBag = makeIcon('ShoppingBag');
export const Sparkles = makeIcon('Sparkles');
export const Star = makeIcon('Star');
export const TrendingUp = makeIcon('TrendingUp');
export const User = makeIcon('User');
export const Wallet = makeIcon('Wallet');
export const Wifi = makeIcon('Wifi');
