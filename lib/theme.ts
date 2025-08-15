import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Brand Colors - Sophisticated Purple/Blue palette
        brand: {
          50: { value: '#f5f3ff' },
          100: { value: '#ede9fe' },
          200: { value: '#ddd6fe' },
          300: { value: '#c4b5fd' },
          400: { value: '#a78bfa' },
          500: { value: '#8b5cf6' },
          600: { value: '#7c3aed' },
          700: { value: '#6d28d9' },
          800: { value: '#5b21b6' },
          900: { value: '#4c1d95' },
          950: { value: '#2e1065' },
        },
        // Secondary Colors - Warm Emerald
        secondary: {
          50: { value: '#ecfdf5' },
          100: { value: '#d1fae5' },
          200: { value: '#a7f3d0' },
          300: { value: '#6ee7b7' },
          400: { value: '#34d399' },
          500: { value: '#10b981' },
          600: { value: '#059669' },
          700: { value: '#047857' },
          800: { value: '#065f46' },
          900: { value: '#064e3b' },
          950: { value: '#022c22' },
        },
        // Accent Colors - Warm Orange
        accent: {
          50: { value: '#fff7ed' },
          100: { value: '#ffedd5' },
          200: { value: '#fed7aa' },
          300: { value: '#fdba74' },
          400: { value: '#fb923c' },
          500: { value: '#f97316' },
          600: { value: '#ea580c' },
          700: { value: '#c2410c' },
          800: { value: '#9a3412' },
          900: { value: '#7c2d12' },
          950: { value: '#431407' },
        },
        // Neutral Grays - Warm undertones
        neutral: {
          50: { value: '#fafaf9' },
          100: { value: '#f5f5f4' },
          200: { value: '#e7e5e4' },
          300: { value: '#d6d3d1' },
          400: { value: '#a8a29e' },
          500: { value: '#78716c' },
          600: { value: '#57534e' },
          700: { value: '#44403c' },
          800: { value: '#292524' },
          900: { value: '#1c1917' },
          950: { value: '#0c0a09' },
        },
        // Error colors
        error: {
          50: { value: '#fef2f2' },
          100: { value: '#fee2e2' },
          200: { value: '#fecaca' },
          300: { value: '#fca5a5' },
          400: { value: '#f87171' },
          500: { value: '#ef4444' },
          600: { value: '#dc2626' },
          700: { value: '#b91c1c' },
          800: { value: '#991b1b' },
          900: { value: '#7f1d1d' },
          950: { value: '#450a0a' },
        },
        // Success colors
        success: {
          50: { value: '#f0fdf4' },
          100: { value: '#dcfce7' },
          200: { value: '#bbf7d0' },
          300: { value: '#86efac' },
          400: { value: '#4ade80' },
          500: { value: '#22c55e' },
          600: { value: '#16a34a' },
          700: { value: '#15803d' },
          800: { value: '#166534' },
          900: { value: '#14532d' },
          950: { value: '#052e16' },
        },
        // Warning colors
        warning: {
          50: { value: '#fffbeb' },
          100: { value: '#fef3c7' },
          200: { value: '#fde68a' },
          300: { value: '#fcd34d' },
          400: { value: '#fbbf24' },
          500: { value: '#f59e0b' },
          600: { value: '#d97706' },
          700: { value: '#b45309' },
          800: { value: '#92400e' },
          900: { value: '#78350f' },
          950: { value: '#451a03' },
        },
      },
      fonts: {
        heading: {
          value:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        },
        body: {
          value:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        },
        mono: {
          value:
            'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        },
      },
      fontSizes: {
        xs: { value: '0.75rem' }, // 12px
        sm: { value: '0.875rem' }, // 14px
        md: { value: '1rem' }, // 16px
        lg: { value: '1.125rem' }, // 18px
        xl: { value: '1.25rem' }, // 20px
        '2xl': { value: '1.5rem' }, // 24px
        '3xl': { value: '1.875rem' }, // 30px
        '4xl': { value: '2.25rem' }, // 36px
        '5xl': { value: '3rem' }, // 48px
        '6xl': { value: '3.75rem' }, // 60px
        '7xl': { value: '4.5rem' }, // 72px
        '8xl': { value: '6rem' }, // 96px
        '9xl': { value: '8rem' }, // 128px
      },
      fontWeights: {
        hairline: { value: 100 },
        thin: { value: 200 },
        light: { value: 300 },
        normal: { value: 400 },
        medium: { value: 500 },
        semibold: { value: 600 },
        bold: { value: 700 },
        extrabold: { value: 800 },
        black: { value: 900 },
      },
      lineHeights: {
        none: { value: 1 },
        tight: { value: 1.25 },
        snug: { value: 1.375 },
        normal: { value: 1.5 },
        relaxed: { value: 1.625 },
        loose: { value: 2 },
      },
      spacing: {
        px: { value: '1px' },
        0: { value: '0' },
        0.5: { value: '0.125rem' },
        1: { value: '0.25rem' },
        1.5: { value: '0.375rem' },
        2: { value: '0.5rem' },
        2.5: { value: '0.625rem' },
        3: { value: '0.75rem' },
        3.5: { value: '0.875rem' },
        4: { value: '1rem' },
        5: { value: '1.25rem' },
        6: { value: '1.5rem' },
        7: { value: '1.75rem' },
        8: { value: '2rem' },
        9: { value: '2.25rem' },
        10: { value: '2.5rem' },
        12: { value: '3rem' },
        14: { value: '3.5rem' },
        16: { value: '4rem' },
        20: { value: '5rem' },
        24: { value: '6rem' },
        28: { value: '7rem' },
        32: { value: '8rem' },
        36: { value: '9rem' },
        40: { value: '10rem' },
        44: { value: '11rem' },
        48: { value: '12rem' },
        52: { value: '13rem' },
        56: { value: '14rem' },
        60: { value: '15rem' },
        64: { value: '16rem' },
        72: { value: '18rem' },
        80: { value: '20rem' },
        96: { value: '24rem' },
      },
      sizes: {
        container: {
          sm: { value: '640px' },
          md: { value: '768px' },
          lg: { value: '1024px' },
          xl: { value: '1280px' },
          '2xl': { value: '1536px' },
        },
      },
      radii: {
        none: { value: '0' },
        sm: { value: '0.125rem' },
        base: { value: '0.25rem' },
        md: { value: '0.375rem' },
        lg: { value: '0.5rem' },
        xl: { value: '0.75rem' },
        '2xl': { value: '1rem' },
        '3xl': { value: '1.5rem' },
        full: { value: '9999px' },
      },
      shadows: {
        xs: { value: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
        sm: { value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
        md: { value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
        lg: { value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
        xl: { value: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' },
        '2xl': { value: '0 25px 50px -12px rgb(0 0 0 / 0.25)' },
        inner: { value: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)' },
        none: { value: '0 0 #0000' },
      },
    },
    semanticTokens: {
      colors: {
        // Semantic color mappings
        bg: {
          canvas: {
            default: { value: '{colors.neutral.50}' },
            _dark: { value: '{colors.neutral.900}' },
          },
          default: {
            default: { value: '{colors.white}' },
            _dark: { value: '{colors.neutral.800}' },
          },
          subtle: {
            default: { value: '{colors.neutral.100}' },
            _dark: { value: '{colors.neutral.700}' },
          },
          muted: {
            default: { value: '{colors.neutral.200}' },
            _dark: { value: '{colors.neutral.600}' },
          },
        },
        fg: {
          default: {
            default: { value: '{colors.neutral.900}' },
            _dark: { value: '{colors.neutral.100}' },
          },
          muted: {
            default: { value: '{colors.neutral.600}' },
            _dark: { value: '{colors.neutral.400}' },
          },
          subtle: {
            default: { value: '{colors.neutral.500}' },
            _dark: { value: '{colors.neutral.500}' },
          },
          error: {
            default: { value: '{colors.error.600}' },
            _dark: { value: '{colors.error.400}' },
          },
        },
        border: {
          default: {
            default: { value: '{colors.neutral.200}' },
            _dark: { value: '{colors.neutral.700}' },
          },
          muted: {
            default: { value: '{colors.neutral.100}' },
            _dark: { value: '{colors.neutral.800}' },
          },
          error: {
            default: { value: '{colors.error.300}' },
            _dark: { value: '{colors.error.600}' },
          },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
