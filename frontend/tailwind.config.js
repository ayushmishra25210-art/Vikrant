/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B3D91',
          50: '#EAF0FB',
          100: '#CBDAF3',
          600: '#0B3D91',
          700: '#163A70',
          800: '#0F2B54',
          900: '#091E3B',
        },
        secondary: '#163A70',
        surface: '#F5F6F8',
        success: {
          DEFAULT: '#1B7A3D',
          bg: '#E7F5EC',
        },
        warning: {
          DEFAULT: '#B8860B',
          bg: '#FBF2DD',
        },
        danger: {
          DEFAULT: '#B3261E',
          bg: '#FCEAEA',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans"', 'Inter', '"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'section-heading': ['21px', { lineHeight: '28px', fontWeight: '600' }],
        'card-heading': ['17px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        table: ['13.5px', { lineHeight: '19px', fontWeight: '400' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
};
