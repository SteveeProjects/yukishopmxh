// ==============================================================================
// YUKI WEB V4 — CENTRALIZED ASSET & ICON MAPPING CONFIGURATION
// Auto-mapped from Asset_icon.zip with vector and web-optimized paths
// ==============================================================================

export interface ProductIconMapping {
  key: string;
  name: string;
  brand: string;
  category: 'PRODUCT' | 'PLATFORM' | 'API' | 'SYSTEM';
  iconPath: string;
  imagePath?: string;
  fallbackIcon: string;
  hasVectorSvg: boolean;
}

export const PRODUCT_ICON_MAP: Record<string, ProductIconMapping> = {
  // --- 1. PLATFORMS (BUFF MXH - 6 PLATFORMS INCL THREADS) ---
  facebook: {
    key: 'facebook',
    name: 'Facebook',
    brand: 'Meta',
    category: 'PLATFORM',
    iconPath: '/assets/icons/platforms/facebook.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  instagram: {
    key: 'instagram',
    name: 'Instagram',
    brand: 'Meta',
    category: 'PLATFORM',
    iconPath: '/assets/icons/platforms/instagram.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  tiktok: {
    key: 'tiktok',
    name: 'TikTok',
    brand: 'ByteDance',
    category: 'PLATFORM',
    iconPath: '/assets/icons/platforms/tiktok.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  youtube: {
    key: 'youtube',
    name: 'YouTube',
    brand: 'Google',
    category: 'PLATFORM',
    iconPath: '/assets/icons/platforms/youtube.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  telegram: {
    key: 'telegram',
    name: 'Telegram',
    brand: 'Telegram FZ-LLC',
    category: 'PLATFORM',
    iconPath: '/assets/icons/platforms/telegram.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  threads: {
    key: 'threads',
    name: 'Threads',
    brand: 'Meta',
    category: 'PLATFORM',
    iconPath: '/assets/icons/platforms/threads.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },

  // --- 2. KHO SẢN PHẨM (20 BRANDS) ---
  adobe: {
    key: 'adobe',
    name: 'Adobe Creative Cloud',
    brand: 'Adobe',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/adobe.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  canva: {
    key: 'canva',
    name: 'Canva',
    brand: 'Canva',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/canva.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  capcut: {
    key: 'capcut',
    name: 'CapCut Pro',
    brand: 'ByteDance',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/capcut.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  chatgpt: {
    key: 'chatgpt',
    name: 'ChatGPT',
    brand: 'OpenAI',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/chatgpt.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  claude: {
    key: 'claude',
    name: 'Claude API',
    brand: 'Anthropic',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/claude.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  deepseek: {
    key: 'deepseek',
    name: 'DeepSeek API',
    brand: 'DeepSeek',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/deepseek.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  duolingo: {
    key: 'duolingo',
    name: 'Duolingo Super',
    brand: 'Duolingo',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/duolingo.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  elevenlabs: {
    key: 'elevenlabs',
    name: 'ElevenLabs Voice AI',
    brand: 'ElevenLabs',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/elevenlabs.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  expressvpn: {
    key: 'expressvpn',
    name: 'ExpressVPN',
    brand: 'ExpressVPN',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/expressvpn.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  gemini: {
    key: 'gemini',
    name: 'Gemini Advanced',
    brand: 'Google',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/gemini.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  grok: {
    key: 'grok',
    name: 'Grok AI (xAI)',
    brand: 'xAI',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/grok.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  higgsfield: {
    key: 'higgsfield',
    name: 'Higgsfield AI Video',
    brand: 'Higgsfield',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/higgsfield.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  hmavpn: {
    key: 'hmavpn',
    name: 'HMA VPN',
    brand: 'HideMyAss',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/hmavpn.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  klingai: {
    key: 'klingai',
    name: 'Kling AI Video',
    brand: 'Kuaishou',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/klingai.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  locketgold: {
    key: 'locketgold',
    name: 'Locket Gold',
    brand: 'Locket',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/locketgold.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  minimax: {
    key: 'minimax',
    name: 'MiniMax Hailuo AI',
    brand: 'MiniMax',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/minimax.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  museai: {
    key: 'museai',
    name: 'Muse AI Video',
    brand: 'Muse',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/museai.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },
  netflix: {
    key: 'netflix',
    name: 'Netflix Premium 4K',
    brand: 'Netflix',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/netflix.svg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: true,
  },
  spotify: {
    key: 'spotify',
    name: 'Spotify Premium',
    brand: 'Spotify',
    category: 'PRODUCT',
    iconPath: '/assets/icons/products/spotify.jpg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: false,
  },

  // --- 3. API & TOOL SMS (STANDALONE PRODUCT) ---
  'codex-api': {
    key: 'codex-api',
    name: 'Codex API',
    brand: 'OpenAI',
    category: 'API',
    iconPath: '/assets/icons/api/codex.svg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: true,
  },
  'api-tool-sms': {
    key: 'api-tool-sms',
    name: 'API Tool SMS',
    brand: 'Yuki Web',
    category: 'API',
    iconPath: '/assets/icons/api/sms-tool.svg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: true,
  },

  // --- 4. SYSTEM ---
  avatar: {
    key: 'avatar',
    name: 'Avatar Businessman',
    brand: 'System',
    category: 'SYSTEM',
    iconPath: '/assets/icons/system/avatar_businessman.svg',
    fallbackIcon: '/assets/images/placeholders/default-product.svg',
    hasVectorSvg: true,
  },
};

export function getProductIcon(keyOrSku: string): string {
  const normalized = keyOrSku.toLowerCase().trim();
  if (PRODUCT_ICON_MAP[normalized]) {
    return PRODUCT_ICON_MAP[normalized].iconPath;
  }
  // Try partial matching
  for (const [key, mapping] of Object.entries(PRODUCT_ICON_MAP)) {
    if (normalized.includes(key)) {
      return mapping.iconPath;
    }
  }
  return '/assets/images/placeholders/default-product.svg';
}
