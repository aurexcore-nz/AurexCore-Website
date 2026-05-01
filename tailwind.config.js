/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.html',
    './core/templates/**/*.html',
    './static/js/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        ivory:        '#F0F4F5',
        'warm-ivory': '#FBF8F2',
        'card-white': '#FFFDFC',
        graphite:     '#182126',
        slate:        '#5E6A71',
        teal:         '#0F8D8A',
        'deep-teal':  '#0B6664',
        aqua:         '#7ED6CF',
        champagne:    '#C8B79E',
        border:       '#E6DED2',
      },
      fontFamily: {
        sora:  ['Sora', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'h1-desktop': ['clamp(2.125rem,5vw,4rem)',  { lineHeight: '1.1', fontWeight: '700' }],
        'h2-desktop': ['clamp(1.75rem,3.5vw,2.625rem)', { lineHeight: '1.2', fontWeight: '600' }],
        'h3-desktop': ['clamp(1.375rem,2vw,1.75rem)',   { lineHeight: '1.3', fontWeight: '600' }],
      },
      spacing: {
        section: '7rem',
      },
      borderRadius: {
        card: '1.5rem',
      },
      boxShadow: {
        card: '0 2px 16px 0 rgba(24,33,38,0.06)',
        'card-hover': '0 8px 32px 0 rgba(15,141,138,0.10)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.25,0.46,0.45,0.94)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
