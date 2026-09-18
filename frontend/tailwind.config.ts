import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#D62828",
          DEFAULT: "#D62828",
        },
        charcoal: {
          DEFAULT: "#2B2B2B",
          alt: "#3B3B3B",
        },
        bodySecondary: "#615E5A",
        mutedGray: "#969089",
        cream: {
          bg: "#FFF8F0",
          alt: "#FFF5E6",
        },
        offWhiteAlt: "#FFFDF9",
        blushTint: "#FDF0EE",
        neutralTint: "#F5F3EE",
        status: {
          successBg: "#E8FDF0",
          errorBg: "#FFF0EE",
          warning: "#FF9500",
          star: "#FFC107",
          whatsapp: "#25D366",
          info: "#007AFF",
        },
        border: {
          default: "#EADCC9",
          active: "#D62828",
          dark: "#2B2B2B",
        },
      },
      fontFamily: {
        heading: ["var(--font-outfit)", "Outfit", "sans-serif"],
        body: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["56px", { lineHeight: "1" }],
        "display-l": ["48px", { lineHeight: "1" }],
        h1: ["40px", { lineHeight: "1" }],
        "h1-alt": ["36px", { lineHeight: "1" }],
        h2: ["28px", { lineHeight: "1" }],
        h3: ["24px", { lineHeight: "1" }],
        h4: ["18px", { lineHeight: "1" }],
        "h4-alt": ["16px", { lineHeight: "1" }],
        button: ["16px", { lineHeight: "1" }],
        label: ["14px", { lineHeight: "1" }],
        body: ["14px", { lineHeight: "1.5" }],
        caption: ["12px", { lineHeight: "1" }],
        tag: ["11px", { lineHeight: "1" }],
      },
      borderRadius: {
        xs: "6px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "26px",
        modal: "18px",
        pill: "100px",
      },
      boxShadow: {
        card: "0px 6px 16px rgba(71, 60, 53, 0.06)",
        elevated: "0px 4px 12px rgba(0, 0, 0, 0.20)",
      },
      screens: {
        mobile: "375px",
        desktop: "1440px",
        admin: "1446px",
      },
    },
  },
  plugins: [],
};
export default config;