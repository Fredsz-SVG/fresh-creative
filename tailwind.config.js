/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "void-bg": "#0F172A",
        "electric-blue": "#3B82F6",
        "toxic-lime": "#84CC16",
      },
    },
  },
  plugins: [],
};
