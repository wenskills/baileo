/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        baileo: {
          ink:    '#0A1F1A',
          forest: '#1B4438',
          mint:   '#2C7A5E',
          sage:   '#E0EDE8',
          bg:     '#F5F7F6',
        },
      },
    },
  },
  plugins: [],
};
