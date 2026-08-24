/** @type {import('tailwindcss').Config} */
const color = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  /*
   * Que `hover:` solo aplique donde hay un cursor de verdad.
   *
   * Sin esto, Tailwind compila cada `hover:` como un `:hover` pelado, y en
   * una pantalla táctil ese estado se ACTIVA al tocar y se queda pegado
   * hasta que tocas otra cosa. Se ve como si la tarjeta que abriste hace
   * un minuto siguiera bajo el dedo. Hay 73 utilidades `hover:` en la app
   * y esta línea las envuelve a todas en `@media (hover: hover)`.
   *
   * Es la corrección de movimiento que más pesa en este proyecto porque es
   * un tablero que se usa en el teléfono del estudio, no en un escritorio.
   */
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        bg: color('--bg'),
        surface: color('--surface'),
        'surface-2': color('--surface-2'),
        'surface-3': color('--surface-3'),
        line: color('--border'),
        'line-strong': color('--border-strong'),
        'line-bajo': color('--border-bajo'),
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
      /*
       * Las sombras salen de variables por tema y no de valores fijos.
       * Antes eran negros con alfas bajísimos, calibrados para fondo
       * claro; en el tema oscuro —que es el que se usa de noche en el
       * estudio— no movían un solo nivel de gris. La escena entera no
       * tenía fuente de luz. El porqué de cada valor está en index.css,
       * donde viven los tres niveles.
       */
      boxShadow: {
        card: 'var(--elevacion-1)',
        raised: 'var(--elevacion-2)',
        sheet: 'var(--elevacion-hoja)',
      },
      transitionTimingFunction: {
        out: 'var(--suave)',
        spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },
      /*
       * El spinner gira más rápido que el 1s que trae Tailwind.
       *
       * No es un capricho: a igual tiempo de carga, un spinner rápido hace
       * que la espera se PERCIBA más corta. Es de lo poco que mejora el
       * rendimiento sentido sin tocar una sola consulta.
       */
      animation: { spin: 'spin 0.7s linear infinite' },
    },
  },
  plugins: [],
}
