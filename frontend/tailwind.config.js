/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        smart: {
          dark: '#1F6F5F',   // Main headings, footers
          medium: '#2FA084', // Primary buttons, accents
          light: '#6FCF97',  // Hover states, secondary accents
          bg: '#EEEEEE',     // Main background color
        }
      }
    },
  },
  plugins: [],
};