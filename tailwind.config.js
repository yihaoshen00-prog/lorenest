/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          50:  '#f8f7f4',
          100: '#f0ede6',
          200: '#e2ddd2',
          300: '#ccc4b4',
          700: '#3d3830',
          800: '#2a2520',
          900: '#1a1714',
          950: '#110f0c'
        },
        accent: {
          DEFAULT: '#7c6fcd',
          light:   '#a093e0',
          dark:    '#5c4fb0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    }
  },
  plugins: []
}
