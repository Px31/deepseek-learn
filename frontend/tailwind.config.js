/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        dsbg: '#1e1e1e',        // Main background
        dspanel: '#181818',     // Sidebar background (darker in deepseek)
        dsborder: '#333333',    // Subtle borders
        dsinput: '#2d2d2d',     // Input & Card background
        dsblue: '#4d6bfe',      // DeepSeek primary blue
        dsbluehover: '#3b54d1', // Hover state
        dstext: '#e0e0e0',      // Primary text
        dsmuted: '#888888',     // Secondary text
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
