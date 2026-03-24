/**
 * Theme palettes. Display names use keys `theme.<id>` in locale files; `label` here is unused in UI.
 * `applyTheme` writes CSS variables consumed by Tailwind theme tokens and custom gradients.
 */
export const THEMES = {
  default: {
    label: 'Dark',
    colors: {
      bg: '#0f0f1a',
      surface: '#1a1a2e',
      brd: '#2a2a4a',
      main: '#e8e8f0',
      dim: '#8888aa',
      accent: '#6c63ff',
      'accent-secondary': '#a78bfa',
      'accent-glow': 'rgba(108, 99, 255, 0.25)',
      'accent-bg': 'rgba(108, 99, 255, 0.08)',
    },
  },
  light: {
    label: 'Light',
    colors: {
      bg: '#f2f2f7',
      surface: '#ffffff',
      brd: '#d1d1d6',
      main: '#1c1c1e',
      dim: '#8e8e93',
      accent: '#5856d6',
      'accent-secondary': '#af52de',
      'accent-glow': 'rgba(88, 86, 214, 0.2)',
      'accent-bg': 'rgba(88, 86, 214, 0.06)',
    },
  },
  sunset: {
    label: 'Sunset Dark',
    colors: {
      bg: '#0f0a12',
      surface: '#1e1424',
      brd: '#3a2440',
      main: '#f0e8ec',
      dim: '#aa7890',
      accent: '#ff3f8f',
      'accent-secondary': '#ff8a2b',
      'accent-glow': 'rgba(255, 63, 143, 0.25)',
      'accent-bg': 'rgba(255, 63, 143, 0.08)',
    },
  },
  'sunset-light': {
    label: 'Sunset Light',
    colors: {
      bg: '#fff5f7',
      surface: '#ffffff',
      brd: '#f0c6d2',
      main: '#2d1a24',
      dim: '#b07088',
      accent: '#e83580',
      'accent-secondary': '#f07a1a',
      'accent-glow': 'rgba(232, 53, 128, 0.2)',
      'accent-bg': 'rgba(232, 53, 128, 0.06)',
    },
  },
  arctic: {
    label: 'Arctic Dark',
    colors: {
      bg: '#0a1218',
      surface: '#121f2a',
      brd: '#1e3a4d',
      main: '#e0f0f8',
      dim: '#6a9fb5',
      accent: '#00d4aa',
      'accent-secondary': '#38bdf8',
      'accent-glow': 'rgba(0, 212, 170, 0.25)',
      'accent-bg': 'rgba(0, 212, 170, 0.08)',
    },
  },
  'arctic-light': {
    label: 'Arctic Light',
    colors: {
      bg: '#f0f9fb',
      surface: '#ffffff',
      brd: '#b8dde8',
      main: '#0c2630',
      dim: '#5a8a9a',
      accent: '#00a884',
      'accent-secondary': '#0891b2',
      'accent-glow': 'rgba(0, 168, 132, 0.2)',
      'accent-bg': 'rgba(0, 168, 132, 0.06)',
    },
  },
  forest: {
    label: 'Forest Dark',
    colors: {
      bg: '#0c1410',
      surface: '#142018',
      brd: '#2a3d32',
      main: '#e8f0ec',
      dim: '#6b8f7a',
      accent: '#22c55e',
      'accent-secondary': '#84cc16',
      'accent-glow': 'rgba(34, 197, 94, 0.25)',
      'accent-bg': 'rgba(34, 197, 94, 0.08)',
    },
  },
  'forest-light': {
    label: 'Forest Light',
    colors: {
      bg: '#f4faf6',
      surface: '#ffffff',
      brd: '#c5ddd0',
      main: '#142818',
      dim: '#5a7a68',
      accent: '#16a34a',
      'accent-secondary': '#65a30d',
      'accent-glow': 'rgba(22, 163, 74, 0.2)',
      'accent-bg': 'rgba(22, 163, 74, 0.06)',
    },
  },
  ember: {
    label: 'Ember Dark',
    colors: {
      bg: '#140f0d',
      surface: '#221a16',
      brd: '#3d2e28',
      main: '#f5ebe8',
      dim: '#a89088',
      accent: '#f97316',
      'accent-secondary': '#ef4444',
      'accent-glow': 'rgba(249, 115, 22, 0.25)',
      'accent-bg': 'rgba(249, 115, 22, 0.08)',
    },
  },
  'ember-light': {
    label: 'Ember Light',
    colors: {
      bg: '#fffaf5',
      surface: '#ffffff',
      brd: '#e8d5c8',
      main: '#2c1810',
      dim: '#8b6f63',
      accent: '#ea580c',
      'accent-secondary': '#dc2626',
      'accent-glow': 'rgba(234, 88, 12, 0.2)',
      'accent-bg': 'rgba(234, 88, 12, 0.06)',
    },
  },
};

export function applyTheme(name) {
  const theme = THEMES[name] || THEMES.default;
  const root = document.documentElement;

  // Maps JS keys like accent-secondary → --color-accent-secondary for CSS and Tailwind v4 @theme.
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.colors.bg);
}
