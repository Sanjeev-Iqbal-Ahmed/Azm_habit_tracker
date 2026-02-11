/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export type ThemeName = 'light' | 'dark';
export type ThemePreference = ThemeName | 'system';

const lightPalette = {
  background: '#F8F9FB',   // app background
  surface: '#FFFFFF',     // cards
  primary: '#010101',     // main text / icons
  secondary: '#4A5568',   // secondary text
  accent: '#b6cbcaff',      // mint cards, progress, highlights
  highlight: '#FBEBCC',   // beige pills (yoga, tags)
  text: '#010101',        // primary text
  accentText: '#010101',  // text on accent backgrounds
  muted: '#6B7280',       // muted labels
  border: '#E5E7EB',      // subtle dividers
};

const darkPalette = {
  background: '#010101',  // true near-black background
  surface: '#151515',     // elevated cards
  primary: '#ECEFF4',     // main text
  secondary: '#CBD5E1',   // secondary text
  accent: '#b6cbcaff',      // mint highlight cards
  highlight: '#FBEBCC',   // beige accent pills
  text: '#ECEFF4',        // primary text
  accentText: '#010101',  // black text on accent backgrounds
  muted: '#94A3B8',       // muted text
  border: '#1F2937',      // subtle separators
};


export const Colors = {
  light: {
    text: lightPalette.text,
    background: lightPalette.background,
    surface: lightPalette.surface,
    card: lightPalette.surface,
    border: lightPalette.border,
    muted: lightPalette.muted,
    accent: lightPalette.accent,
    accentText: lightPalette.accentText,
    tint: lightPalette.primary,
    icon: lightPalette.muted,
    tabIconDefault: lightPalette.muted,
    tabIconSelected: lightPalette.primary,
  },
  dark: {
    text: darkPalette.text,
    background: darkPalette.background,
    surface: darkPalette.surface,
    card: darkPalette.surface,
    border: darkPalette.border,
    muted: darkPalette.muted,
    accent: darkPalette.accent,
    accentText: darkPalette.accentText,
    tint: darkPalette.primary,
    icon: darkPalette.muted,
    tabIconDefault: darkPalette.muted,
    tabIconSelected: darkPalette.primary,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
