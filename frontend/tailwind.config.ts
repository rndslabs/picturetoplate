import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper:            'var(--paper)',
        'paper-2':        'var(--paper-2)',
        cream:            'var(--cream)',
        ink:              'var(--ink)',
        'ink-2':          'var(--ink-2)',
        'ink-3':          'var(--ink-3)',
        sage:             'var(--sage)',
        'sage-deep':      'var(--sage-deep)',
        'sage-soft':      'var(--sage-soft)',
        apricot:          'var(--apricot)',
        'apricot-deep':   'var(--apricot-deep)',
        'apricot-soft':   'var(--apricot-soft)',
        tomato:           'var(--tomato)',
        hairline:         'var(--hairline)',
        'hairline-2':     'var(--hairline-2)',
      },
      fontFamily: {
        serif: ['var(--serif)'],
        sans:  ['var(--sans)'],
        mono:  ['var(--mono)'],
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
    },
  },
  plugins: [],
} satisfies Config
