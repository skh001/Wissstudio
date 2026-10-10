import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ["'Jost Variable'", "Jost", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Cormorant Garamond'", "Georgia", "'Times New Roman'", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        blush: { 50: "#FFF6FA", 100: "#FDEBF3", 200: "#FAD7E6", 300: "#F4BDD3", 400: "#E99BBB" },
        rosegold: { 300: "#D9A3AB", 400: "#C88792", 500: "#B76E79", 600: "#9A5763", 700: "#7A434D" },
        champagne: "#EBD3BC",
        plum: "#3B2A32",
        status: {
          confirmed: "#F4A6C6",
          pending: "#F5D77A",
          completed: "#8FD3A8",
          cancelled: "#EE8F8F",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 10px)",
        "3xl": "calc(var(--radius) + 16px)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(122,67,77,0.04), 0 8px 24px -12px rgba(122,67,77,0.14)",
        lift: "0 2px 4px rgba(122,67,77,0.05), 0 18px 40px -16px rgba(122,67,77,0.24)",
      },
      backgroundImage: {
        lacquer:
          "linear-gradient(125deg, #FAD7E6 0%, #F7C9DA 32%, #EBD3BC 78%, #F6E4D6 100%)",
        "lacquer-dark":
          "linear-gradient(125deg, #4A2D3A 0%, #5B3343 40%, #5E4637 100%)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { shimmer: "shimmer 1.6s infinite" },
    },
  },
  plugins: [animate],
};

export default config;
