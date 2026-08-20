/** @type {import('tailwindcss').Config} */
const color = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: color('--bg'),
        surface: color('--surface'),
        'surface-2': color('--surface-2'),
        'surface-3': color('--surface-3'),
        line: color('--border'),
        'line-strong': color('--border-strong'),
        fg: color('--fg'),
        'fg-muted': color('--fg-muted'),
        'fg-subtle': color('--fg-subtle'),
        primary: color('--primary'),
        'primary-hover': color('--primary-hover'),
        'primary-fg': color('--primary-fg'),
        accent: color('--accent'),
        success: color('--success'),
        warn: color('--warn'),
        danger: color('--danger'),
        info: color('--info'),
      },
      /*
       * Las tres voces. Ver la nota larga de src/index.css: `sans` e
       * `display` son fuentes propias auto-hospedadas, `mono` es la del
       * sistema. Detrás de cada una va la pila de siempre, que es lo que se
       * ve mientras la descarga llega — y lo único que se ve si nunca llega.
       *
       * Antes esto ya declaraba tres familias, pero las dos primeras solo se
       * distinguían en Windows: en el teléfono ambas caían en `system-ui` y
       * eran la misma letra. La jerarquía existía en la config y en ningún
       * lado más.
       */
      fontFamily: {
        sans: ['Inter', '"Segoe UI Variable Text"', '"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', '"Segoe UI Variable Display"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', '"Cascadia Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.375rem', { lineHeight: '2.6rem', letterSpacing: '-0.025em' }],
      },
      spacing: { 4.5: '1.125rem', 13: '3.25rem', 18: '4.5rem', 22: '5.5rem' },
      borderRadius: { lg: '0.625rem', xl: '0.875rem', '2xl': '1.125rem', '3xl': '1.5rem' },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.06), 0 1px 1px rgb(0 0 0 / 0.04)',
        raised: '0 4px 16px -4px rgb(0 0 0 / 0.18)',
        sheet: '0 -8px 40px -8px rgb(0 0 0 / 0.35)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
