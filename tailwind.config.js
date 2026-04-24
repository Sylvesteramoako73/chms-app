/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        navy: {
          DEFAULT: '#0B1120',
          50: '#f0f3f9',
          100: '#e1e8f2',
          200: '#c7d3e6',
          300: '#9eb4d3',
          400: '#7090bc',
          500: '#4e70a3',
          600: '#3c5686',
          700: '#31466e',
          800: '#2a3b5c',
          900: '#0B1120',
        },
        gold: {
          DEFAULT: '#C9A84C',
          50: '#fcfaf6',
          100: '#f8f2e5',
          200: '#eedfc3',
          300: '#e2c595',
          400: '#d4a961',
          500: '#c9A84C',
          600: '#b08432',
          700: '#8e6429',
          800: '#755127',
          900: '#644425',
        },
        sage: {
          DEFAULT: '#4A7C6F',
          50: '#f4f8f7',
          100: '#e3efeb',
          200: '#c6ded7',
          300: '#9ec4b9',
          400: '#72a396',
          500: '#4A7C6F',
          600: '#3c6459',
          700: '#335249',
          800: '#2b423c',
          900: '#263732',
        },
        cream: {
          DEFAULT: '#F5F5F0',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Cormorant Garamond"', 'serif'],
      }
    },
  },
  plugins: [],
}
