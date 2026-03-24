export const THEMES = {
  default: {
    label: 'Default',
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
  sunset: {
    label: 'Sunset',
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
