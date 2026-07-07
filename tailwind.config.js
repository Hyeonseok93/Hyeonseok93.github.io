/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./src/**/*.html", "./src/**/*.js"],
  theme: {
    extend: {
      colors: {
        bgPrimary: '#191919',
        bgSecondary: '#202020',
        bgSidebar: '#202020',
        accentAmber: '#d97706',
        accentCyan: '#eab308',
        textPrimary: '#e3e3e2',
        textSecondary: '#9b9b9a',
        textMuted: '#5a5a57',
      }
    },
  },
  plugins: [],
}
