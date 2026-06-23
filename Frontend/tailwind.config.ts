import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // System font stack matching Luma — feels native on every device
        sans: [
          '-apple-system', 'BlinkMacSystemFont',
          '"Inter Variable"', 'Inter',
          '"Segoe UI"', 'Roboto',
          '"Helvetica Neue"', 'Arial', 'sans-serif',
        ],
        body: [
          '-apple-system', 'BlinkMacSystemFont',
          '"Inter Variable"', 'Inter',
          '"Segoe UI"', 'Roboto', 'sans-serif',
        ],
        mono: ['"SF Mono"', 'Menlo', 'Monaco', 'Consolas', '"Courier New"', 'monospace'],
      },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "var(--radius)",
        card: "12px",
        xl: "24px",
        modal: "32px",
      },
      maxWidth: {
        content: "820px",
        wide: "960px",
        xwide: "1080px",
      },
      boxShadow: {
        // Luma's signature 5-layer subtle stack
        card: "0 1.6px 3px rgba(0,0,0,.02), 0 4.2px 7px rgba(0,0,0,.03), 0 8px 14px rgba(0,0,0,.04), 0 17.5px 29px rgba(0,0,0,.05), 0 48px 80px rgba(0,0,0,.06)",
        "card-xs": "0 1px 4px rgba(0,0,0,.06)",
        "card-inner": "0 -4px 4px rgba(0,0,0,.04) inset",
      },
      transitionTimingFunction: {
        luma: "cubic-bezier(.4, 0, .2, 1)",
        bounce: "cubic-bezier(.54, 1.12, .38, 1.11)",
      },
      transitionDuration: {
        fast: "200ms",
        slow: "600ms",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s cubic-bezier(.4,0,.2,1)",
        "accordion-up": "accordion-up 0.2s cubic-bezier(.4,0,.2,1)",
        "fade-in": "fade-in 200ms cubic-bezier(.4,0,.2,1) forwards",
        "fade-out": "fade-out 200ms cubic-bezier(.4,0,.2,1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
