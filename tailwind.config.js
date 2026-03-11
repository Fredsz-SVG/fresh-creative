/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/admin/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/album/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/auth/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/invite/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/join/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/login/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/register/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/reset-password/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/signup/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/user/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/forgot-password/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/*.{js,ts,jsx,tsx,mdx}",
    "./app/globals.css",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* Pastel palette */
        pastel: {
          lavender: '#c4b5fd',
          pink: '#f9a8d4',
          mint: '#a7f3d0',
          peach: '#fcd5b4',
          sky: '#bae6fd',
          lemon: '#fde68a',
          lilac: '#ddd6fe',
        },
        /* Accent solids */
        accent: {
          purple: '#8b5cf6',
          pink: '#ec4899',
          mint: '#34d399',
          peach: '#fb923c',
          sky: '#38bdf8',
        },
        /* Dashboard background */
        'fresh-bg': '#fafaff',
        'fresh-card': '#fafaff',
        'fresh-border': '#e8e8f0',
        'fresh-text': '#1e1e32',
        'fresh-muted': '#787891',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'pastel': '0 4px 20px rgba(139, 92, 246, 0.08)',
        'pastel-lg': '0 8px 30px rgba(139, 92, 246, 0.12)',
        'card': '0 2px 12px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 30px rgba(139, 92, 246, 0.08), 0 2px 8px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
};
