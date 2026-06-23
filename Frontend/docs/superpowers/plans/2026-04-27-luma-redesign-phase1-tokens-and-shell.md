# Luma Redesign — Phase 1 (Tokens & Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Founder Key's gold/cream theme with an indigo-and-neutral Luma-style palette, rewrite the attendee layout from sidebar to top-nav, slim down the organizer/admin sidebars, delete the `ParticleBackground` and `GlassCard` components, and add a light/dark theme toggle. End state: a fully Luma-looking app where every existing flow still works unchanged.

**Architecture:** Token-first cascade. Because `components.json` has `cssVariables: true`, replacing the HSL values in `src/index.css` `:root` and `.dark` blocks plus the color tokens in `tailwind.config.ts` automatically reskins ~70% of the UI through the shadcn primitives. Custom utility classes (`.gold-*`, `.glass-card`, `.gold-pill`, etc.) are kept alive in Phase 1 with **neutralized implementations** so existing call sites don't break — Phase 2 will run a codemod that removes the class references from JSX and then deletes the now-dead classes from CSS. Layouts and the few components hardcoding gold rgba values are rewritten directly.

**Tech Stack:** React 18 + Vite 5 + TypeScript 5.8 + Tailwind 3.4 + shadcn/ui + framer-motion + react-router-dom 6 + `next-themes` (already in `package.json` line 54 — no install needed) + lucide-react.

**Spec:** `docs/superpowers/specs/2026-04-27-luma-redesign-design.md`

---

## File Structure

| File | Operation | Responsibility |
|---|---|---|
| `tailwind.config.ts` | Modify | Replace gold/cream color tokens; drop Cormorant from `fontFamily`; add `max-w-content/wide/xwide`, `shadow-card`/`shadow-card-inner`, new timing tokens |
| `src/index.css` | Modify | Replace `:root` HSL vars (light) and add `.dark` block; drop Cormorant `@import` and noise grain; neutralize gold utility class implementations; drop gold selection/focus/scrollbar; replace `.progress-fill` and `.nav-item.active::before` with indigo |
| `src/components/ui/button.tsx` | Modify | Drop hardcoded `rgba(201,168,76,...)` shadow on `gold` variant; alias `gold`/`gold-ghost`/`gold-subtle` to neutral indigo equivalents |
| `src/components/Logo.tsx` | Modify | Drop `.gold-gradient-text` and `font-display`; plain text + Zap mark in indigo |
| `src/components/ParticleBackground.tsx` | Delete | No longer used |
| `src/components/GlassCard.tsx` | Delete | Replaced by `<div className="bg-card border rounded-card shadow-card p-4">` at call sites |
| `src/components/AppLayout.tsx` | Rewrite | Top-nav layout for attendee (no sidebar). Keep mobile bottom nav with new label set: Discover / Events / Connect / Profile |
| `src/components/OrganizerLayout.tsx` | Modify | Slim sidebar, hairline border, drop `.gold-pill` |
| `src/components/AdminLayout.tsx` | Modify | Slim sidebar, hairline border, drop `.gold-pill` |
| `src/components/LandingNav.tsx` | Modify | Minimal top bar, transparent over hero, drop `.glass-card` |
| `src/components/PageTransition.tsx` | Modify | Simplify to 200ms fade; remove translateY |
| `src/components/ThemeProvider.tsx` | Create | Wraps `next-themes` ThemeProvider with sensible defaults |
| `src/components/ThemeToggle.tsx` | Create | Sun/Moon icon button for the top-nav |
| `src/App.tsx` | Modify | Wrap app in `<ThemeProvider>` |
| `index.html` | Modify | Drop legacy TODO comments left by the prior generator, add `<meta name="theme-color">`, drop Cormorant preconnect (none currently, just confirming) |

Files NOT touched in Phase 1 (handled in Phase 2):
- All `src/pages/**` files (token cascade carries them; gold class references removed by codemod in Phase 2)
- All `src/components/ui/**` shadcn components (cascade)
- `src/components/EventCard.tsx`, `CategoryGrid.tsx` (cascade, polish in Phase 2)

---

## Pre-flight checks (run once before starting Task 1)

The implementer should verify the workspace is clean and the build works baseline:

```bash
cd /d/Founder-Key/golden-tap-connect
git status              # should be clean
npm install             # if node_modules absent
npm run build           # baseline build — should succeed
```

If `npm run build` fails before any change, stop and investigate before proceeding.

---

## Task 1: Set up the feature branch

**Files:**
- None (git operation only)

- [ ] **Step 1: Create the branch from current main**

```bash
cd /d/Founder-Key/golden-tap-connect
git checkout -b luma-redesign-phase1-tokens-and-shell
```

Expected: `Switched to a new branch 'luma-redesign-phase1-tokens-and-shell'`

- [ ] **Step 2: Verify clean state**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

---

## Task 2: Replace Tailwind theme tokens

**Files:**
- Modify: `tailwind.config.ts` (full rewrite of `theme.extend`)

- [ ] **Step 1: Replace the entire file**

Write `tailwind.config.ts`:

```ts
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
        // Legacy aliases — keep gold/cream tokens pointing at neutral indigo/foreground so
        // any unmigrated `bg-gold` / `text-cream` references render in the new palette
        // until Phase 2's codemod removes them.
        gold: {
          DEFAULT: "hsl(var(--primary))",
          bright: "hsl(var(--primary))",
          dim: "hsl(var(--muted-foreground))",
          faint: "hsl(var(--muted))",
        },
        cream: {
          DEFAULT: "hsl(var(--foreground))",
          muted: "hsl(var(--muted-foreground))",
          hint: "hsl(var(--muted))",
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
```

- [ ] **Step 2: Verify config still parses**

```bash
npx tsc --noEmit
```

Expected: completes without errors. Tailwind config has no type errors.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(theme): replace gold tokens with indigo + neutral in tailwind config"
```

---

## Task 3: Replace CSS variables and neutralize utility classes

**Files:**
- Modify: `src/index.css` (full rewrite)

This task does three things in one commit because they reference each other and any partial state would fail to compile:
1. Replace the `:root` HSL block (light mode default) and add a new `.dark` block
2. Drop the Cormorant `@import` and noise grain
3. Rewrite gold utility classes to render in neutral indigo (so existing JSX call sites still work but no longer look gold)

- [ ] **Step 1: Replace the entire file**

Write `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light mode — Luma-style off-white + near-black */
    --background: 0 0% 100%;
    --foreground: 222 13% 11%;

    --card: 0 0% 100%;
    --card-foreground: 222 13% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 13% 11%;

    --primary: 239 84% 60%;             /* indigo-600 #4f46e5 */
    --primary-foreground: 0 0% 100%;

    --secondary: 220 14% 96%;
    --secondary-foreground: 222 13% 11%;

    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;

    --accent: 239 84% 95%;
    --accent-foreground: 239 84% 30%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;

    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;

    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 239 84% 60%;

    --radius: 0.5rem;

    --sidebar-background: 0 0% 100%;
    --sidebar-foreground: 222 13% 11%;
    --sidebar-primary: 239 84% 60%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 220 14% 96%;
    --sidebar-accent-foreground: 222 13% 11%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 239 84% 60%;
  }

  .dark {
    /* Dark mode — Luma's off-black + translucent surfaces */
    --background: 220 13% 9%;             /* #131517 */
    --foreground: 0 0% 100%;

    --card: 220 13% 12%;
    --card-foreground: 0 0% 100%;

    --popover: 220 13% 12%;
    --popover-foreground: 0 0% 100%;

    --primary: 239 84% 67%;               /* indigo-500, slightly lighter on dark */
    --primary-foreground: 0 0% 100%;

    --secondary: 220 13% 16%;
    --secondary-foreground: 0 0% 100%;

    --muted: 220 13% 16%;
    --muted-foreground: 220 9% 64%;

    --accent: 220 13% 18%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 72% 56%;
    --destructive-foreground: 0 0% 100%;

    --success: 142 71% 50%;
    --success-foreground: 0 0% 0%;

    --border: 220 13% 18%;
    --input: 220 13% 18%;
    --ring: 239 84% 67%;

    --sidebar-background: 220 13% 9%;
    --sidebar-foreground: 0 0% 100%;
    --sidebar-primary: 239 84% 67%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 220 13% 16%;
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 220 13% 18%;
    --sidebar-ring: 239 84% 67%;
  }
}

@layer base {
  * { @apply border-border; }
  html { scroll-behavior: smooth; }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter Variable', Inter, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-feature-settings: "cv11", "ss01";
    font-optical-sizing: auto;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: inherit;
    font-weight: 600;
  }
  h1, h2 { text-wrap: balance; }
  p { text-wrap: pretty; }

  ::selection {
    background: hsl(var(--primary) / 0.16);
    color: hsl(var(--foreground));
  }

  :focus-visible {
    outline: 2px solid hsl(var(--ring) / 0.5);
    outline-offset: 2px;
    border-radius: 6px;
  }
}

@layer components {

  /* Card — clean & minimal (replaces .glass-card, name kept for transitional compatibility) */
  .glass-card {
    @apply bg-card border border-border rounded-card shadow-card-xs;
  }
  .glass-card-hover {
    @apply glass-card transition-all duration-fast;
  }
  .glass-card-hover:hover {
    @apply shadow-card;
  }
  .glass-card-elevated {
    @apply bg-card border border-border rounded-card shadow-card;
  }

  /* Gold utility-class shims — neutralized in Phase 1, removed in Phase 2 */
  .gold-gradient-text {
    color: hsl(var(--foreground));
    background: none;
    -webkit-text-fill-color: currentColor;
  }

  .gold-shimmer-text {
    color: hsl(var(--foreground));
    background: none;
    -webkit-text-fill-color: currentColor;
    animation: none;
  }

  .gold-gradient-bg {
    background: hsl(var(--primary));
    box-shadow: none;
  }

  .gold-gradient-bg-subtle {
    background: hsl(var(--primary) / 0.08);
  }

  .gold-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: hsl(var(--muted));
    border: 1px solid hsl(var(--border));
    color: hsl(var(--foreground));
    border-radius: 100px;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
  }

  .gold-input {
    background: hsl(var(--background));
    border: 1px solid hsl(var(--input));
    border-radius: 8px;
    color: hsl(var(--foreground));
    padding: 10px 14px;
    outline: none;
    font-family: inherit;
    font-size: 14px;
    transition: border-color 0.15s ease;
  }
  .gold-input:focus {
    border-color: hsl(var(--ring));
  }
  .gold-input::placeholder { color: hsl(var(--muted-foreground)); }

  .gold-glow { box-shadow: none; }
  .gold-border-glow { border: 1px solid hsl(var(--border)) !important; box-shadow: none; }

  .shimmer-overlay { display: none; }
  .gradient-border { border: 1px solid hsl(var(--border)); border-radius: 16px; }
  .gradient-border::before { display: none; }

  .card-spotlight { overflow: hidden; }
  .card-spotlight-glow { display: none; }

  .progress-track {
    height: 4px;
    border-radius: 100px;
    background: hsl(var(--muted));
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 100px;
    background: hsl(var(--primary));
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    transition: color 0.2s ease, background 0.2s ease;
    position: relative;
  }
  .nav-item:hover {
    color: hsl(var(--foreground));
    background: hsl(var(--muted));
  }
  .nav-item.active {
    color: hsl(var(--primary));
    background: hsl(var(--accent));
  }
  .nav-item.active::before {
    content: '';
    position: absolute;
    left: 0; top: 20%; bottom: 20%;
    width: 2px;
    border-radius: 0 2px 2px 0;
    background: hsl(var(--primary));
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: hsl(var(--muted-foreground));
  }

  .stat-chip {
    @apply bg-card border border-border rounded-card text-center;
    padding: 20px 16px;
  }

  .live-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 6px rgba(34,197,94,0.5);
    animation: live-pulse 2s ease-in-out infinite;
    flex-shrink: 0;
  }

  .skeleton-gold {
    border-radius: 8px;
    background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--secondary)) 50%, hsl(var(--muted)) 75%);
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
  }

  /* Per-event theme tinting hook — Phase 2 wires the data attribute on event detail pages */
  [data-event-theme] {
    background: color-mix(in srgb, var(--event-accent) 6%, hsl(var(--background)));
  }
}

/* Keyframes */
@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes nfc-pulse {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
@keyframes live-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
  50% { box-shadow: 0 0 0 4px rgba(34,197,94,0); }
}
@keyframes progress-in {
  from { width: 0; }
}
@keyframes fade-up-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

.animate-nfc-pulse { animation: nfc-pulse 1.8s ease-out infinite; }
.animate-float { animation: float 6s ease-in-out infinite; }
.animate-fade-up { animation: fade-up-in 0.3s cubic-bezier(.4,0,.2,1) forwards; }
.animate-scale-in { animation: scale-in 0.3s cubic-bezier(.4,0,.2,1) forwards; }

/* Stagger */
.bento-stagger > * { opacity: 0; }
.bento-stagger > *:nth-child(1)  { animation: card-in 0.3s ease forwards 0.03s; }
.bento-stagger > *:nth-child(2)  { animation: card-in 0.3s ease forwards 0.06s; }
.bento-stagger > *:nth-child(3)  { animation: card-in 0.3s ease forwards 0.09s; }
.bento-stagger > *:nth-child(4)  { animation: card-in 0.3s ease forwards 0.12s; }
.bento-stagger > *:nth-child(5)  { animation: card-in 0.3s ease forwards 0.15s; }
.bento-stagger > *:nth-child(6)  { animation: card-in 0.3s ease forwards 0.18s; }
.bento-stagger > *:nth-child(7)  { animation: card-in 0.3s ease forwards 0.21s; }
.bento-stagger > *:nth-child(8)  { animation: card-in 0.3s ease forwards 0.24s; }
.bento-stagger > *:nth-child(9)  { animation: card-in 0.3s ease forwards 0.27s; }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 100px;
  transition: background 0.2s ease;
}
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
```

- [ ] **Step 2: Run dev server and verify it boots**

```bash
npm run dev
```

Expected: dev server starts on `http://localhost:8080` with no compile errors. Open the browser. Note: the **app will look broken visually** until Tasks 4–14 finish, but it must compile.

Stop the dev server (Ctrl+C) before continuing.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): replace CSS vars + neutralize gold utility classes"
```

---

## Task 4: Update Button component to drop hardcoded gold shadow

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Replace the file**

Write `src/components/ui/button.tsx`:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium font-body transition-colors duration-fast ease-luma focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-border bg-background text-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        // Legacy aliases — keep call sites working until Phase 2 codemod replaces them
        gold: "bg-primary text-primary-foreground hover:bg-primary/90",
        "gold-ghost": "border border-border bg-transparent text-foreground hover:bg-muted",
        "gold-subtle": "bg-primary/10 text-primary hover:bg-primary/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-6 text-base",
        xl: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

Key changes vs. the previous file:
- `gold` variant now indistinguishable from `default` (both indigo)
- `gold-ghost` styled as outline; `gold-subtle` as low-opacity primary
- `transition-all duration-200` → `transition-colors duration-fast ease-luma` (Luma's standard ease)
- Removed `active:scale-[0.97]` (Luma doesn't push buttons down)
- Removed `hover:shadow-[0_0_24px_rgba(201,168,76,0.4)] hover:-translate-y-0.5` from gold variant

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(button): drop gold shadow + alias gold variants to indigo"
```

---

## Task 5: Update Logo to drop gold-gradient-text + serif

**Files:**
- Modify: `src/components/Logo.tsx`

- [ ] **Step 1: Replace the file**

Write `src/components/Logo.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <Zap className={`${iconSizes[size]} text-primary fill-primary`} />
      <span className={`font-semibold tracking-tight text-foreground ${sizes[size]}`}>
        FounderKey
      </span>
    </Link>
  );
};
```

Key changes:
- Drop `font-display` (was Cormorant)
- Drop `gold-gradient-text` (was metallic gradient)
- Smaller default sizes (Luma uses modest type)
- Plain `text-foreground` color

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Logo.tsx
git commit -m "feat(logo): drop gold gradient + serif, plain indigo wordmark"
```

---

## Task 6: Delete ParticleBackground component

**Files:**
- Delete: `src/components/ParticleBackground.tsx`
- Modify: any pages that import it (`LandingPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`)

- [ ] **Step 1: Find all imports of ParticleBackground**

Use Grep tool with pattern `from ['"]@/components/ParticleBackground['"]` across `src/`.

Expected matches: `src/pages/LandingPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`.

- [ ] **Step 2: Remove the import line and any `<ParticleBackground />` JSX from each of the 3 pages**

For each file, delete the import line (e.g., `import { ParticleBackground } from '@/components/ParticleBackground';`) AND every `<ParticleBackground />` element in the JSX. Do NOT change anything else in those pages — Phase 2 handles their full reskin. Just remove the particle references.

- [ ] **Step 3: Delete the component file**

```bash
rm src/components/ParticleBackground.tsx
```

- [ ] **Step 4: Verify build still compiles**

```bash
npm run build
```

Expected: build succeeds with no missing-import errors. (Bundle size should drop slightly.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: delete ParticleBackground component + remove imports"
```

---

## Task 7: Delete GlassCard component and replace usages

**Files:**
- Delete: `src/components/GlassCard.tsx`
- Modify: any files that import it

- [ ] **Step 1: Find all imports of GlassCard**

Use Grep tool with pattern `from ['"]@/components/GlassCard['"]` across `src/`.

Note the matching files. There should be ~5 files.

- [ ] **Step 2: For each file with a GlassCard import, do the following replacement**

Replace the import:
```tsx
import { GlassCard } from '@/components/GlassCard';
```

with nothing (delete the line). Then replace every `<GlassCard … >` opening tag with `<div className="bg-card border border-border rounded-card shadow-card-xs p-5">` and every `</GlassCard>` closing tag with `</div>`. If the GlassCard had a `className` prop, merge it into the div's className. If it had `padding="lg"` use `p-7`; `padding="sm"` use `p-4`; `padding="md"` (default) use `p-5`; `padding="none"` use no padding class. Drop `hover`, `elevated`, `glow`, `spotlight`, `onClick` props (Phase 2 handles richer reskins; for Phase 1 the substitution preserves layout/structure only).

If a `GlassCard` was used with `onClick`, wrap the replacement div in a `<button>` element or attach `onClick` directly — pick whichever keeps the existing JSX structure intact.

- [ ] **Step 3: Delete the component file**

```bash
rm src/components/GlassCard.tsx
```

- [ ] **Step 4: Verify build still compiles**

```bash
npm run build
```

Expected: 0 missing-import errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: delete GlassCard component + inline its replacement"
```

---

## Task 8: Create the ThemeProvider wrapper

**Files:**
- Create: `src/components/ThemeProvider.tsx`
- Create: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Create the ThemeProvider**

Write `src/components/ThemeProvider.tsx`:

```tsx
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="light"
    enableSystem
    disableTransitionOnChange
  >
    {children}
  </NextThemesProvider>
);
```

- [ ] **Step 2: Create the ThemeToggle button**

Write `src/components/ThemeToggle.tsx`:

```tsx
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ThemeToggle = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-9 h-9" aria-hidden />;
  }

  const current = theme === 'system' ? resolvedTheme : theme;
  const next = current === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      className="inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {current === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemeProvider.tsx src/components/ThemeToggle.tsx
git commit -m "feat(theme): add ThemeProvider + ThemeToggle (next-themes)"
```

---

## Task 9: Wire ThemeProvider into App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add ThemeProvider import + wrap the tree**

Edit `src/App.tsx`. After this existing import block at the top of the file:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "./pages/NotFound.tsx";
```

Add this line:

```tsx
import { ThemeProvider } from "@/components/ThemeProvider";
```

Then change the `App` component's outermost wrapper. Replace:

```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

with:

```tsx
const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

And replace the closing tags. Replace:

```tsx
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
);
```

with:

```tsx
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);
```

- [ ] **Step 2: Verify typecheck and dev server**

```bash
npx tsc --noEmit
npm run dev
```

Expected: dev server boots; the app still renders. The `<html>` element should now get a `class="light"` attribute (verify in browser devtools).

Stop the dev server before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(theme): wire ThemeProvider into App tree"
```

---

## Task 10: Rewrite AppLayout — top-nav, no sidebar

**Files:**
- Modify: `src/components/AppLayout.tsx` (full rewrite)

This is the largest single component change in Phase 1. The attendee shell goes from `[sidebar 240px] [main]` to `[top nav 64px] [main]`. Mobile keeps the bottom nav with a refreshed item set: Discover / Events / Connect / Profile.

- [ ] **Step 1: Replace the file**

Write `src/components/AppLayout.tsx`:

```tsx
import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppStore } from '@/store/appStore';
import { useUnreadCount } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell, Compass, Calendar, Scan, User as UserIcon,
  LogOut, Plus, Search, Trophy, Users, QrCode,
} from 'lucide-react';

const topLinks = [
  { label: 'Discover', path: '/discover' },
  { label: 'Events', path: '/events' },
  { label: 'Connect', path: '/connect' },
];

const bottomNav = [
  { label: 'Discover', icon: Compass, path: '/discover' },
  { label: 'Events', icon: Calendar, path: '/events' },
  { label: 'Connect', icon: Scan, path: '/connect' },
  { label: 'Profile', icon: UserIcon, path: '/profile' },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const { data: unreadCount = 0 } = useUnreadCount();
  const [searchOpen, setSearchOpen] = useState(false);
  const handleLogout = () => { logout(); navigate('/login'); };

  // "+ Create" button only for users who can host events
  const isOrganizer =
    user?.role === 'organizer' || (Array.isArray(user?.roles) && user.roles.includes('organizer'));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top Nav (sticky, 64px) ────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-xwide mx-auto h-16 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Logo size="md" />
            <nav className="hidden md:flex items-center gap-1">
              {topLinks.map((link) => {
                const active = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'text-foreground bg-muted'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
              className="hidden md:inline-flex w-9 h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            <ThemeToggle />

            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative inline-flex w-9 h-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {isOrganizer && (
              <Button size="sm" asChild className="hidden md:inline-flex ml-1">
                <Link to="/organizer/events/create">
                  <Plus className="w-4 h-4" />
                  Create
                </Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="ml-1 w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center text-foreground text-sm font-semibold border border-border"
                >
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0]?.toUpperCase() || 'U'
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">{user?.name || 'Member'}</span>
                  <span className="text-xs text-muted-foreground font-normal">FK Score · {user?.fkScore ?? 0}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile"><UserIcon className="w-4 h-4 mr-2" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/connections"><Users className="w-4 h-4 mr-2" /> Connections</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/gamification"><Trophy className="w-4 h-4 mr-2" /> Achievements</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/apply-card"><QrCode className="w-4 h-4 mr-2" /> Founder Card</Link>
                </DropdownMenuItem>
                {!isOrganizer && (
                  <DropdownMenuItem disabled>
                    <Plus className="w-4 h-4 mr-2" /> Become an organizer
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="flex-1 px-4 md:px-8 py-6 md:py-10 max-w-xwide w-full mx-auto pb-24 md:pb-10">
        {children}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      >
        <div className="flex justify-around py-1.5">
          {bottomNav.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-0.5 py-1.5 px-4"
              >
                <item.icon
                  className={`w-5 h-5 transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Search drawer placeholder — wired in Phase 2 */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg shadow-card w-full max-w-xl mx-4 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              placeholder="Search events, people, calendars…"
              className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
              onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
            />
            <p className="text-xs text-muted-foreground mt-2">Press Esc to close · full search wired in Phase 2</p>
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors. (If `useAppStore`'s `User` type doesn't have `roles`/`role` shaped like our `isOrganizer` check expects, narrow the optional-chained access — see existing typing in `src/store/appStore.ts` if needed.)

- [ ] **Step 3: Boot dev server, smoke-test attendee routes**

```bash
npm run dev
```

Open `http://localhost:8080/login` (you may need to log in; demo mode works), then visit `/dashboard`, `/events`, `/connect`, `/profile`. Expected:
- Top nav (logo · Discover · Events · Connect · search · theme · bell · avatar) renders on desktop
- Mobile (resize to <768px): bottom nav with Discover / Events / Connect / Profile
- Theme toggle flips light/dark and persists across reloads
- No console errors

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppLayout.tsx
git commit -m "feat(layout): rewrite AppLayout — top-nav for attendee, no sidebar"
```

---

## Task 11: Reskin OrganizerLayout

**Files:**
- Modify: `src/components/OrganizerLayout.tsx`

- [ ] **Step 1: Replace the file**

Write `src/components/OrganizerLayout.tsx`:

```tsx
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppStore } from '@/store/appStore';
import {
  LayoutDashboard, Calendar, Users, Download, LogOut,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/organizer/dashboard' },
  { label: 'Create Event', icon: Calendar, path: '/organizer/events/create' },
  { label: 'Attendees', icon: Users, path: '/organizer/attendees' },
  { label: 'Leads', icon: Download, path: '/organizer/leads' },
];

export const OrganizerLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-60 border-r border-border p-4 fixed h-full z-40 bg-background">
        <div className="mb-1 px-2"><Logo /></div>
        <p className="text-xs text-muted-foreground mb-6 px-2">Organizer</p>
        <nav className="flex-1 space-y-0.5" aria-label="Organizer">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-accent text-primary font-medium border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 md:ml-60 min-h-screen">
        <main className="p-4 md:p-8 max-w-xwide mx-auto">{children}</main>
      </div>
    </div>
  );
};
```

Key changes:
- Width 64 → 60 (slimmer)
- Drop `gold-pill` "Organizer" badge → plain text label under logo
- Active state: indigo accent bg + 2px indigo left border
- ThemeToggle added at bottom
- `max-w-7xl` → `max-w-xwide` (1080px)

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/OrganizerLayout.tsx
git commit -m "feat(layout): slim OrganizerLayout sidebar, drop gold-pill"
```

---

## Task 12: Reskin AdminLayout

**Files:**
- Modify: `src/components/AdminLayout.tsx`

- [ ] **Step 1: Replace the file**

Write `src/components/AdminLayout.tsx`:

```tsx
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAppStore } from '@/store/appStore';
import {
  LayoutDashboard, Users, Calendar, BarChart3, Settings, LogOut, Shield,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Users', icon: Users, path: '/admin/users' },
  { label: 'Events', icon: Calendar, path: '/admin/events' },
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { label: 'Permissions', icon: Shield, path: '/admin/permissions' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-60 border-r border-border p-4 fixed h-full z-40 bg-background">
        <div className="mb-1 px-2"><Logo /></div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground mb-6 px-2">
          <Shield className="w-3 h-3" /> Admin
        </p>
        <nav className="flex-1 space-y-0.5" aria-label="Admin">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-accent text-primary font-medium border-l-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 md:ml-60 min-h-screen">
        <main className="p-4 md:p-8 max-w-xwide mx-auto">{children}</main>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminLayout.tsx
git commit -m "feat(layout): slim AdminLayout sidebar, drop gold-pill"
```

---

## Task 13: Reskin LandingNav

**Files:**
- Modify: `src/components/LandingNav.tsx`

- [ ] **Step 1: Replace the file**

Write `src/components/LandingNav.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export const LandingNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-xwide mx-auto flex items-center justify-between h-16 px-6">
        <Logo />
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <Button size="sm" asChild>
            <Link to="/login">Get started</Link>
          </Button>
        </div>
        <button
          className="md:hidden text-foreground"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden p-6 border-t border-border flex flex-col gap-4 bg-background">
          <a href="#features" className="text-sm text-muted-foreground">Features</a>
          <a href="#pricing" className="text-sm text-muted-foreground">Pricing</a>
          <Button size="sm" asChild><Link to="/login">Get started</Link></Button>
        </div>
      )}
    </nav>
  );
};
```

Key changes:
- Drop `glass-card rounded-none border-t-0 border-x-0` → plain `bg-background/80 backdrop-blur-md border-b border-border`
- Drop `variant="gold"` → default (indigo)
- "Log In" → "Get started" + add a separate "Sign in" link (Luma's pattern)

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LandingNav.tsx
git commit -m "feat(layout): minimal LandingNav, drop glass-card"
```

---

## Task 14: Simplify PageTransition

**Files:**
- Modify: `src/components/PageTransition.tsx`

- [ ] **Step 1: Replace the file**

Write `src/components/PageTransition.tsx`:

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';

export const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
```

Key changes:
- Drop `y` translation — Luma transitions are pure opacity
- Duration 0.4s → 0.2s (Luma's `--fast-transition-duration`)
- Easing `[0.22, 1, 0.36, 1]` → `[0.4, 0, 0.2, 1]` (Luma's standard ease)

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PageTransition.tsx
git commit -m "feat(motion): simplify PageTransition to 200ms fade"
```

---

## Task 15: Update index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the file**

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="theme-color" content="#131517" media="(prefers-color-scheme: dark)" />
    <title>Founder Key</title>
    <meta name="description" content="An event networking platform for founders." />

    <meta property="og:type" content="website" />
    <meta property="og:title" content="Founder Key" />
    <meta property="og:description" content="An event networking platform for founders." />
    <meta property="og:image" content="/og-default.png" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Founder Key" />
    <meta name="twitter:description" content="An event networking platform for founders." />
    <meta name="twitter:image" content="/og-default.png" />
  </head>

  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Key changes:
- Drop the `<!-- TODO -->` comments left over from the previous generator
- Drop `<meta name="author" content="..." />` placeholder left by the previous generator
- Add `theme-color` for both light and dark
- Slightly tighten the description copy

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "chore(html): clean up legacy TODO comments, add theme-color meta"
```

---

## Task 16: Phase 1 acceptance — smoke test

**Files:**
- None (verification only)

This task is the gate before declaring Phase 1 done.

- [ ] **Step 1: Verify no gold/cream/Cormorant references remain in source**

Use Grep tool with these patterns and `path: src/`:
- pattern: `gold-gradient-text|gold-shimmer|gold-pill|gold-glow|gold-border-glow|glass-card-elevated|glass-card-hover` — output: `count`
- pattern: `Cormorant Garamond|font-display` — output: `count`
- pattern: `rgba\(212,\s*168,\s*76|rgba\(201,\s*168,\s*76|hsl\(40 70%` — output: `count`

These will return non-zero counts because Phase 1 deliberately keeps gold class names alive as transitional aliases (with neutral implementations) AND because pages still reference `font-display`/`gold-gradient-text` in JSX. **That's expected.** Phase 2's codemod removes those references.

The CSS file itself (`src/index.css`) still defines the gold-named classes — that's also expected; they get fully deleted in Phase 2 once JSX no longer references them. Don't fail this check on those.

What matters for Phase 1 acceptance: there is **no hardcoded gold-tinted color (rgba/hex) being painted at runtime.** All visible gold disappears because the utility classes were neutralized in Task 3.

- [ ] **Step 2: Build production bundle**

```bash
npm run build
```

Expected: build succeeds. No TypeScript errors. Bundle size should be slightly smaller than baseline (ParticleBackground + spotlight code + Cormorant fonts gone).

- [ ] **Step 3: Boot dev server and click through every route**

```bash
npm run dev
```

Open `http://localhost:8080` and verify the following acceptance items:

- [ ] `/` (LandingPage) — renders in light mode by default; nav is minimal; no gold text or particles
- [ ] `/login` — renders; can submit form (use demo creds or real backend)
- [ ] `/register` — renders
- [ ] `/dashboard` — renders inside the new top-nav layout (no left sidebar on desktop); FK Score shown; no gold gradient text
- [ ] `/events` — renders with new layout
- [ ] `/connect` — renders; QR code visible (no gold-glow halo)
- [ ] `/connections` — renders
- [ ] `/discover` — renders
- [ ] `/profile` — renders
- [ ] `/notifications` — renders
- [ ] `/gamification` — renders
- [ ] `/apply-card` — renders
- [ ] `/organizer/dashboard` — slim sidebar (no gold-pill) — must log in as organizer (demo mode `mockOrganizer`)
- [ ] `/organizer/events/create` — renders
- [ ] `/organizer/attendees` — renders
- [ ] `/organizer/leads` — renders
- [ ] `/admin/dashboard` — slim sidebar — must log in as admin (demo mode `mockAdmin`)
- [ ] `/admin/users` — renders
- [ ] `/admin/events` — renders
- [ ] Theme toggle (Sun/Moon button in top nav) flips light↔dark
- [ ] After theme flip and page reload, choice is persisted (next-themes uses localStorage)
- [ ] No console errors on any of the above routes

If any check fails, fix the issue, commit, then retry the smoke test.

Stop the dev server.

- [ ] **Step 4: Final cleanup commit (if any fixes were needed)**

```bash
git status      # verify clean
git log --oneline luma-redesign-phase1-tokens-and-shell ^main
```

You should see ~15 commits. Phase 1 is complete and shippable.

- [ ] **Step 5: (optional) Push the branch**

Only push if the user explicitly asks. Phase 1 can stay local until they're ready to review.

---

## Self-Review Checklist (run before handing off)

After all 16 tasks are written:

**Spec coverage:**
- [x] §3.1 Color tokens → Task 2, 3
- [x] §3.2 Typography (system stack, drop Cormorant) → Task 2 (fontFamily), Task 3 (body font-family + heading inherit)
- [x] §3.3 Spacing & layout (max-w-content/wide/xwide) → Task 2
- [x] §3.4 Radii (sm/DEFAULT/card/lg/xl/modal) → Task 2
- [x] §3.5 Shadows (5-layer card stack + inner) → Task 2
- [x] §3.6 Motion (200/300/600 + luma/bounce easings) → Task 2 + Task 14
- [x] §3.7 What dies in Phase 1: gold utility classes → Task 3 (neutralized; full delete deferred to Phase 2 once JSX is migrated). ParticleBackground → Task 6. GlassCard → Task 7. Cormorant import → Task 3 (no `@import` line in new CSS). Noise grain → Task 3.
- [x] §4.1 Attendee top-nav shell → Task 10
- [x] §4.2 Organizer slim sidebar → Task 11
- [x] §4.3 Admin slim sidebar → Task 12
- [x] §4.5 Marketing LandingNav → Task 13
- [x] Light/dark theme toggle → Task 8 + 9
- [ ] §4.4 Inside-organizer-event tab layout — **Phase 3 scope**, deferred
- [ ] §5 Auth/RSVP flows — **Phase 3 scope**, deferred
- [ ] §6 Page rewrites (LandingPage, LoginPage, EventDetail, CreateEvent) — **Phase 2 scope**, deferred

**Placeholder scan:** No "TBD"/"TODO"/"implement later" markers in any task. The acceptance smoke test mentions Phase 2/3 deferrals explicitly with the rationale; that's not a placeholder, that's scope-definition.

**Type consistency:** `ThemeProvider`, `ThemeToggle`, `AppLayout`, layouts all use the same lucide imports + `next-themes` types. Button `variant="gold"` → still works (aliased), so no call-site type errors. No type mismatches across tasks.

**Order of operations:** Build is preserved at every commit boundary. Tokens go first (Task 2, 3), components depending on the tokens follow, deletions only happen after their consumers are updated. Each task's "verify" step would catch a break before the commit.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-27-luma-redesign-phase1-tokens-and-shell.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with isolated context per task.
2. **Inline Execution** — I execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?
