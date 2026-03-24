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
};

export function applyTheme(name) {
  const theme = THEMES[name] || THEMES.default;
  const root = document.documentElement;

  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.colors.bg);
}
