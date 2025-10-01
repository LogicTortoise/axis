

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#D4A574',
        secondary: '#E8D5C4',
        tertiary: '#F5EBE0',
        accent: '#C9A882',
        background: '#FAF7F4',
        surface: '#FFFFFF',
        textPrimary: '#3E3E3E',
        textSecondary: '#8B8B8B',
        border: '#E5DDD5',
        success: '#A8C5A0',
        warning: '#E8C4A0',
        danger: '#D4A5A5',
        info: '#A5C4D4'
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'soft': '0 1px 3px rgba(0, 0, 0, 0.05)'
      },
      borderRadius: {
        'card': '16px',
        'button': '12px'
      }
    }
  },
  plugins: [],
}

