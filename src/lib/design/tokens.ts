// ==============================================================================
// YUKI WEB V4 — UI/UX DESIGN SYSTEM TOKENS (MUALIKE1S PREMIUM SAAS INSPIRATION)
// Refined Deep Indigo/Navy Background, Glowing Cyan/Electric Blue Accents, Depth
// ==============================================================================

export const designTokens = {
  colors: {
    // Backgrounds & Surfaces (Deep Space Navy inspired by MuaLike1s)
    background: '#070C1E',      // Ultra deep navy/black
    backgroundSecondary: '#0B1126', // Slightly elevated layer
    surface: '#0F172E',         // Card background
    surfaceHover: '#16203D',    // Hovered card
    surfaceBorder: '#1E293B',   // Subtle border
    surfaceBorderActive: '#38BDF8', // Active selected border (Cyan glow)
    
    // Header & Floating Pill elements
    headerBg: 'rgba(15, 23, 46, 0.85)',
    headerBorder: 'rgba(255, 255, 255, 0.08)',

    // Foreground Text
    foreground: '#F8FAFC',      // Crisp White
    foregroundMuted: '#94A3B8', // Soft Slate
    foregroundSubtle: '#64748B',

    // Primary Interactive (Electric Cyan / Sky Blue)
    primary: '#38BDF8',         // Sky 400
    primaryHover: '#0284C7',    // Sky 600
    primaryGlow: 'rgba(56, 189, 248, 0.25)',

    // Secondary Accents (Indigo / Violet)
    accentViolet: '#8B5CF6',
    accentPink: '#EC4899',

    // Financial & Ledger Semantics
    financialCredit: '#10B981', // Emerald 500
    financialDebit: '#EF4444',  // Red 500
    financialBalance: '#34D399',// Emerald 400

    // Status Badges
    statusPending: '#F59E0B',   // Amber 500
    statusProcessing: '#38BDF8',// Sky 500
    statusCompleted: '#10B981', // Emerald 500
    statusFailed: '#EF4444',    // Red 500
    statusNeedsReview: '#F97316',// Orange 500
  },

  typography: {
    fontDisplay: 'Space Grotesk, sans-serif',
    fontBody: 'Inter, sans-serif',
    fontMono: 'JetBrains Mono, monospace',
    scale: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
    },
  },

  // Mobile-First Touch Targets (Strict Android >= 44px)
  touchTarget: {
    minSize: '44px',
    spacing: '8px',
  },

  // Breakpoints
  breakpoints: {
    mobileSm: '360px',
    mobileBase: '375px',
    mobileLg: '390px',
    mobileXl: '430px',
    tablet: '768px',
    desktop: '1024px',
  },

  // 7 UX Component States Contract
  states: [
    'LOADING',
    'SUCCESS',
    'ERROR',
    'EMPTY',
    'DISABLED',
    'PENDING',
    'CONFIRMATION',
  ] as const,
};
