import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/modules/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        fire: {
          red: "#DC2626",
          ember: "#EF4444",
          tactical: "#0B1120",
          panel: "#111827",
          steel: "#1F2937",
          mist: "#F3F4F6"
        }
      },
      boxShadow: {
        glow: "0 0 35px rgba(220, 38, 38, 0.28)",
        panel: "0 20px 80px rgba(0, 0, 0, 0.35)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        "radial-red": "radial-gradient(circle at top right, rgba(220,38,38,.28), transparent 34%)"
      }
    }
  },
  plugins: [animate]
};

export default config;
