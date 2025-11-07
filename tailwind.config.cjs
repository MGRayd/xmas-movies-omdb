/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    fontFamily: {
      'sans': ['Poppins', 'sans-serif'],
      'serif': ['Poppins', 'sans-serif'],
      'display': ['Playfair Display', 'serif'],
      'body': ['Poppins', 'sans-serif'],
      'christmas': ['Playfair Display', 'serif'],
    },
    extend: {
      colors: {
        terraveil: {
          bg:   '#0f1115', // page background
          card: '#12151b', // card background
          line: '#c23c3c', // crimson accent (headers/dividers)
          text: '#E6E6E6',
          mute: '#9AA0A6',
          link: '#d56060',
        },
        xmas: {
          bg: '#1c2331',     // deep navy background
          card: '#2c3e50',   // slate blue for cards
          line: '#c0392b',   // deep red for accents
          text: '#f5f5f5',   // off-white text
          mute: '#a0aec0',   // muted slate blue
          link: '#e67e22',   // burnt orange for links
          gold: '#d4af37',   // antique gold for special elements
          snow: '#f8f9fa',   // snow white
        },
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            fontFamily: 'Poppins, sans-serif',
            lineHeight: '1.7',
            maxWidth: '70ch',
          }
        },
        invert: {
          css: {
            '--tw-prose-body': theme('colors.xmas.text'),
            '--tw-prose-headings': theme('colors.xmas.line'),
            '--tw-prose-links': theme('colors.xmas.link'),
            '--tw-prose-bold': theme('colors.xmas.text'),
            '--tw-prose-bullets': theme('colors.xmas.mute'),
            '--tw-prose-hr': theme('colors.xmas.line'),
            fontFamily: 'Poppins, sans-serif',
            h1: {
              fontFamily: 'Playfair Display, serif',
              fontWeight: '900',
              letterSpacing: '-0.025em',
            },
            h2: {
              fontFamily: 'Playfair Display, serif',
              fontWeight: '700',
              letterSpacing: '-0.015em',
            },
            h3: {
              fontFamily: 'Playfair Display, serif',
              fontWeight: '700',
            },
            p: {
              fontFamily: 'Poppins, sans-serif',
              fontWeight: '300',
            },
            strong: {
              fontWeight: '700',
            },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
  daisyui: {
    darkTheme: 'xmas',
    themes: [
      {
        terraveil: {
          'color-scheme': 'dark',
          primary:   '#d56060',
          secondary: '#7a8aa1',
          accent:    '#c23c3c',
          neutral:   '#1a1d23',
          'base-100': '#0f1115', // bg
          'base-200': '#12151b', // card
          'base-300': '#191d24', // borders
          info:    '#58a6ff',
          success: '#34d399',
          warning: '#f59e0b',
          error:   '#ef4444',
        },
      },
      {
        xmas: {
          'color-scheme': 'dark',
          primary:   '#c0392b', // Modern Christmas red
          secondary: '#1c2331', // Deep navy
          accent:    '#d4af37', // Antique gold
          neutral:   '#2c3e50', // Slate blue
          'base-100': '#1c2331', // bg - deep navy
          'base-200': '#2c3e50', // card - slate blue
          'base-300': '#34495e', // borders - darker slate
          info:    '#3498db',
          success: '#2ecc71',
          warning: '#e67e22', // Burnt orange
          error:   '#e74c3c',
        },
      },
      'dark', // fallback
    ],
  },
}
