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
      'display': ['Mountains of Christmas', 'cursive'],
      'body': ['Poppins', 'sans-serif'],
      'christmas': ['Mountains of Christmas', 'cursive'],
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
          bg: '#121a2b',     // deep blue background
          card: '#1a2540',   // slightly lighter blue for cards
          line: '#d42426',   // bright red for accents
          text: '#ffffff',   // white text
          mute: '#a3b1d6',   // muted blue-white
          link: '#ff8b3d',   // orange for links
          gold: '#ffd700',   // gold for special elements
          snow: '#f0f0f0',   // snow white
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
              fontFamily: 'Mountains of Christmas, cursive',
              fontWeight: '900',
              letterSpacing: '-0.025em',
            },
            h2: {
              fontFamily: 'Mountains of Christmas, cursive',
              fontWeight: '700',
              letterSpacing: '-0.015em',
            },
            h3: {
              fontFamily: 'Mountains of Christmas, cursive',
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
  plugins: [require('daisyui'), require('@tailwindcss/typography')],
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
          primary:   '#d42426', // Christmas red
          secondary: '#121a2b', // Deep blue
          accent:    '#ffd700', // Gold
          neutral:   '#1a2540', // Darker blue
          'base-100': '#121a2b', // bg - deep blue
          'base-200': '#1a2540', // card - slightly lighter blue
          'base-300': '#2d3a5d', // borders - medium blue
          info:    '#58a6ff',
          success: '#34d399',
          warning: '#ff8b3d', // Orange
          error:   '#ef4444',
        },
      },
      'dark', // fallback
    ],
  },
}
