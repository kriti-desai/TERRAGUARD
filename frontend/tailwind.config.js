/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0d1b2a',
          800: '#0f2133',
          700: '#1a2f45',
          600: '#1e3a5f',
          500: '#2a4d6e'
        },
        cyan: {
          400: '#22d3ee',
          500: '#00b4d8',
          600: '#0077b6'
        },
        risk: {
          high: '#ef4444',
          elevated: '#f97316',
          moderate: '#eab308',
          low: '#22c55e',
        }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
