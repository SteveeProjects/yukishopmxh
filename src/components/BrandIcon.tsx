'use client';

import React, { useEffect, useId, useState } from 'react';

export type BrandIconSize = 'sm' | 'md' | 'lg';

export interface BrandIconProps {
  slug?: string;
  name?: string;
  iconPath?: string;
  size?: BrandIconSize;
  laser?: boolean;
  active?: boolean;
  className?: string;
}

type CanonicalBrandKey =
  | 'gemini'
  | 'chatgpt'
  | 'claude'
  | 'mb-bank'
  | 'youtube'
  | 'capcut'
  | 'netflix'
  | 'spotify'
  | 'canva'
  | 'google-one'
  | 'tiktok'
  | 'facebook'
  | 'instagram'
  | 'telegram'
  | 'threads'
  | 'grok'
  | 'deepseek'
  | 'duolingo'
  | 'vpn'
  | 'klingai'
  | 'higgsfield'
  | 'minimax'
  | 'elevenlabs'
  | 'museai'
  | 'locketgold'
  | 'api-tool-sms'
  | 'adobe'
  | 'generic';

const PUBLIC_ICON_MAP: Partial<Record<CanonicalBrandKey, string>> = {
  gemini: '/assets/icons/products/gemini.jpg',
  chatgpt: '/assets/icons/products/chatgpt.jpg',
  claude: '/assets/icons/products/claude.jpg',
  'mb-bank': '/assets/icons/mb-bank.jpg',
  youtube: '/assets/icons/products/youtube.jpg',
  capcut: '/assets/icons/products/capcut.jpg',
  netflix: '/assets/icons/products/netflix.svg',
  spotify: '/assets/icons/products/spotify.jpg',
  canva: '/assets/icons/products/canva.jpg',
  tiktok: '/assets/icons/platforms/tiktok.jpg',
  facebook: '/assets/icons/platforms/facebook.jpg',
  instagram: '/assets/icons/platforms/instagram.jpg',
  telegram: '/assets/icons/platforms/telegram.jpg',
  threads: '/assets/icons/platforms/threads.jpg',
  grok: '/assets/icons/products/grok.jpg',
  deepseek: '/assets/icons/products/deepseek.jpg',
  duolingo: '/assets/icons/products/duolingo.jpg',
  vpn: '/assets/icons/products/expressvpn.jpg',
  klingai: '/assets/icons/products/klingai.jpg',
  higgsfield: '/assets/icons/products/higgsfield.jpg',
  minimax: '/assets/icons/products/minimax.jpg',
  elevenlabs: '/assets/icons/products/elevenlabs.jpg',
  museai: '/assets/icons/products/museai.jpg',
  locketgold: '/assets/icons/products/locketgold.jpg',
  'api-tool-sms': '/assets/icons/api/sms-tool.svg',
  adobe: '/assets/icons/products/adobe.jpg',
};

const PLACEHOLDER_PATHS = new Set([
  '',
  '/assets/images/logo.png',
  '/assets/images/placeholders/default-product.svg',
]);

function resolveBrandKey(slug?: string, name?: string, iconPath?: string): CanonicalBrandKey {
  const haystack = `${slug || ''} ${name || ''} ${iconPath || ''}`.toLowerCase();

  if (haystack.includes('google-one') || haystack.includes('google one')) return 'google-one';
  if (haystack.includes('gemini')) return 'gemini';
  if (haystack.includes('chatgpt') || haystack.includes('openai') || haystack.includes('codex')) return 'chatgpt';
  if (haystack.includes('claude') || haystack.includes('anthropic')) return 'claude';
  if (haystack.includes('mb-bank') || haystack.includes('mb bank') || haystack.includes('mb-voucher')) return 'mb-bank';
  if (haystack.includes('tiktok') || haystack.includes('tt-')) return 'tiktok';
  if (haystack.includes('facebook') || haystack.includes('fb-')) return 'facebook';
  if (haystack.includes('instagram') || haystack.includes('ig-')) return 'instagram';
  if (haystack.includes('threads') || haystack.includes('th-')) return 'threads';
  if (haystack.includes('telegram') || haystack.includes('tg-')) return 'telegram';
  if (haystack.includes('youtube') || haystack.includes('yt-')) return 'youtube';
  if (haystack.includes('capcut')) return 'capcut';
  if (haystack.includes('netflix')) return 'netflix';
  if (haystack.includes('spotify')) return 'spotify';
  if (haystack.includes('canva')) return 'canva';
  if (haystack.includes('grok')) return 'grok';
  if (haystack.includes('deepseek')) return 'deepseek';
  if (haystack.includes('duolingo')) return 'duolingo';
  if (haystack.includes('vpn') || haystack.includes('expressvpn') || haystack.includes('hma')) return 'vpn';
  if (haystack.includes('kling')) return 'klingai';
  if (haystack.includes('higgsfield')) return 'higgsfield';
  if (haystack.includes('minimax')) return 'minimax';
  if (haystack.includes('elevenlabs')) return 'elevenlabs';
  if (haystack.includes('muse')) return 'museai';
  if (haystack.includes('locket')) return 'locketgold';
  if (haystack.includes('sms') || haystack.includes('api-tool')) return 'api-tool-sms';
  if (haystack.includes('adobe')) return 'adobe';

  return 'generic';
}

function BrandVectorSvg({ brandKey, uid }: { brandKey: CanonicalBrandKey; uid: string }) {
  const gradA = `yuki_grad_a_${uid}`;
  const gradB = `yuki_grad_b_${uid}`;

  switch (brandKey) {
    case 'gemini':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradA} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="52%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="#090D16" />
          <path
            d="M20 5.5C21.1 13.4 26.6 18.9 34.5 20C26.6 21.1 21.1 26.6 20 34.5C18.9 26.6 13.4 21.1 5.5 20C13.4 18.9 18.9 13.4 20 5.5Z"
            fill={`url(#${gradA})`}
          />
          <circle cx="29.5" cy="10.5" r="1.4" fill="#E0F2FE" opacity="0.85" />
        </svg>
      );

    case 'chatgpt':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#081C18" />
          <circle cx="20" cy="20" r="14" fill="#10A37F" opacity="0.18" />
          <g fill="none" stroke="#10A37F" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 9.5L26 13V20" />
            <path d="M29.1 14.8L29.1 21.7L23 25.2" />
            <path d="M29.1 25.2L23 28.7L17 25.2" />
            <path d="M20 30.5L14 27V20" />
            <path d="M10.9 25.2V18.3L17 14.8" />
            <path d="M10.9 14.8L17 11.3L23 14.8" />
          </g>
        </svg>
      );

    case 'claude':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#1B120E" />
          <g stroke="#D97757" strokeWidth="2.4" strokeLinecap="round">
            <line x1="20" y1="8.5" x2="20" y2="31.5" />
            <line x1="8.5" y1="20" x2="31.5" y2="20" />
            <line x1="11.9" y1="11.9" x2="28.1" y2="28.1" />
            <line x1="28.1" y1="11.9" x2="11.9" y2="28.1" />
            <line x1="15.4" y1="9.4" x2="24.6" y2="30.6" strokeWidth="1.8" opacity="0.9" />
            <line x1="30.6" y1="15.4" x2="9.4" y2="24.6" strokeWidth="1.8" opacity="0.9" />
          </g>
          <circle cx="20" cy="20" r="3.4" fill="#FDBA74" />
        </svg>
      );

    case 'mb-bank':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradA} x1="4" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1E3A8A" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill={`url(#${gradA})`} />
          <path d="M9 28L12.5 14L17 21.5L21.5 14L25 28H21.2L19.4 20.5L17 24.5L14.6 20.5L12.8 28H9Z" fill="#FFFFFF" />
          <path d="M29.2 9.5L30.8 14.1L35.6 14.2L31.8 17.1L33.2 21.7L29.2 18.9L25.2 21.7L26.6 17.1L22.8 14.2L27.6 14.1L29.2 9.5Z" fill="#EF4444" />
        </svg>
      );

    case 'youtube':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#16090C" />
          <rect x="6" y="10.5" width="28" height="19" rx="6" fill="#FF0000" />
          <polygon points="17.2,15 26.2,20 17.2,25" fill="#FFFFFF" />
        </svg>
      );

    case 'capcut':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#0B0E14" />
          <path
            d="M11 12.5L24.5 20L11 27.5M18 11L30 18.2V21.8L18 29"
            fill="none"
            stroke="#F8FAFC"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'netflix':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#0B090C" />
          <path d="M12.5 8H17.2V32H12.5V8Z" fill="#B91C1C" />
          <path d="M22.8 8H27.5V32H22.8V8Z" fill="#B91C1C" />
          <path d="M12.5 8H17.5L27.5 32H22.5L12.5 8Z" fill="#E50914" />
        </svg>
      );

    case 'spotify':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#09150F" />
          <circle cx="20" cy="20" r="13" fill="#1ED760" />
          <path d="M13 16.5C17.5 15 23.5 15.3 27.5 17.6" stroke="#09150F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M14 20.6C17.8 19.5 22.5 19.8 25.8 21.7" stroke="#09150F" strokeWidth="2.1" strokeLinecap="round" fill="none" />
          <path d="M15.2 24.5C18.2 23.7 21.8 24 24.3 25.5" stroke="#09150F" strokeWidth="1.9" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'canva':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradA} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00C4CC" />
              <stop offset="60%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#7D2AE8" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="#09131F" />
          <circle cx="20" cy="20" r="13" fill={`url(#${gradA})`} />
          <path
            d="M24.8 15.2C22.4 13.5 18.6 13.9 16.4 16.4C14.1 19 14.3 22.8 16.9 25C19.2 27 22.7 26.8 25.1 24.7"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'google-one':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#0B111E" />
          <path d="M13 15.8L20.5 9.5L23.5 13L16 19.3L13 15.8Z" fill="#EA4335" />
          <path d="M19 9.5H23.5V19H19V9.5Z" fill="#4285F4" />
          <path d="M19 19H23.5V25H19V19Z" fill="#FBBC05" />
          <path d="M19 25H23.5V30.5H19V25Z" fill="#34A853" />
        </svg>
      );

    case 'tiktok':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#06080E" />
          <path
            d="M22.2 9.5V23.2C22.2 25.8 20.1 27.9 17.5 27.9C15.1 27.9 13.2 26 13.2 23.6C13.2 21.3 15 19.4 17.3 19.3"
            fill="none"
            stroke="#25F4EE"
            strokeWidth="3.2"
            strokeLinecap="round"
            transform="translate(-1,-1)"
          />
          <path
            d="M22.2 9.5C22.9 12.9 25.5 15.5 28.8 16M22.2 9.5V23.2C22.2 25.8 20.1 27.9 17.5 27.9C15.1 27.9 13.2 26 13.2 23.6C13.2 21.3 15 19.4 17.3 19.3"
            fill="none"
            stroke="#FE2C55"
            strokeWidth="3.2"
            strokeLinecap="round"
            transform="translate(1,1)"
          />
          <path
            d="M22.2 9.5C22.9 12.9 25.5 15.5 28.8 16M22.2 9.5V23.2C22.2 25.8 20.1 27.9 17.5 27.9C15.1 27.9 13.2 26 13.2 23.6C13.2 21.3 15 19.4 17.3 19.3"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'facebook':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#1877F2" />
          <path
            d="M23.5 34V22.2H27.3L27.9 17.8H23.5V15C23.5 13.7 23.9 12.9 25.7 12.9H28.1V8.9C27.6 8.8 26.2 8.7 24.5 8.7C21 8.7 18.6 10.8 18.6 14.7V17.8H14.8V22.2H18.6V34H23.5Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'instagram':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradA} x1="6" y1="34" x2="34" y2="6" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="50%" stopColor="#EC4899" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill={`url(#${gradA})`} />
          <rect x="9.5" y="9.5" width="21" height="21" rx="6.2" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
          <circle cx="20" cy="20" r="4.8" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
          <circle cx="26.2" cy="13.8" r="1.4" fill="#FFFFFF" />
        </svg>
      );

    case 'telegram':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#0B1928" />
          <circle cx="20" cy="20" r="13" fill="#2AABEE" />
          <path
            d="M26.5 13.5L11.5 19.3C10.5 19.7 10.5 20.3 11.3 20.6L15.1 21.8L23.9 16.3C24.3 16 24.7 16.2 24.4 16.5L17.3 22.9L17 26.8C17.4 26.8 17.6 26.6 17.9 26.3L20.1 24.2L24.5 27.4C25.3 27.9 25.9 27.6 26.1 26.7L28.5 15.1C28.8 13.9 28 13.1 26.5 13.5Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'threads':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#090B10" />
          <path
            d="M24.2 19.5C24.2 15.8 21.9 14.3 19.4 14.5C17.4 14.7 16.1 16 15.8 17.3M24.2 19.5C24.2 22.4 22.5 24.7 19.6 24.7C17.4 24.7 15.9 23.2 15.9 21.2C15.9 19.2 17.6 18 20.2 18.2C23.5 18.4 26.4 19.8 27.4 22.5C28.8 26.3 25.7 30.8 19.8 30.8C13.7 30.8 9.8 26.5 9.8 20C9.8 13.5 13.8 9.2 20.1 9.2C25 9.2 28.4 11.8 29.6 15.5"
            fill="none"
            stroke="#F8FAFC"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'grok':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#090D16" />
          <circle cx="20" cy="20" r="10.5" fill="none" stroke="#F8FAFC" strokeWidth="2.4" strokeDasharray="50 12" />
          <line x1="12.5" y1="27.5" x2="29" y2="11" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'deepseek':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#0B162C" />
          <path
            d="M11 22C11 16 15.5 11.5 21.5 12C26.5 12.4 29.8 16.5 29 21.5C28.3 25.7 24.2 28.5 19.5 28.2C14.8 27.9 11 25.4 11 22Z"
            fill="#3B82F6"
          />
          <circle cx="24" cy="18.2" r="1.8" fill="#E0F2FE" />
          <path d="M13 15.5C14.5 12.2 17.5 11.5 18.8 13" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'duolingo':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#11220D" />
          <path d="M10.5 14.5C13 11 27 11 29.5 14.5V23.5C29.5 28 24.5 30.5 20 30.5C15.5 30.5 10.5 28 10.5 23.5V14.5Z" fill="#58CC02" />
          <circle cx="15.5" cy="19.5" r="3.4" fill="#FFFFFF" />
          <circle cx="24.5" cy="19.5" r="3.4" fill="#FFFFFF" />
          <circle cx="16" cy="19.5" r="1.5" fill="#1E293B" />
          <circle cx="24" cy="19.5" r="1.5" fill="#1E293B" />
          <polygon points="18,23.2 22,23.2 20,26.2" fill="#FACC15" />
        </svg>
      );

    case 'vpn':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradA} x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="#09111F" />
          <path d="M20 7.5L30.5 11.8V19.6C30.5 25.8 25.9 30.6 20 32.5C14.1 30.6 9.5 25.8 9.5 19.6V11.8L20 7.5Z" fill={`url(#${gradA})`} />
          <rect x="16.5" y="18.2" width="7" height="5.8" rx="1.5" fill="#FFFFFF" />
          <path d="M17.8 18.2V16C17.8 14.8 18.8 13.8 20 13.8C21.2 13.8 22.2 14.8 22.2 16V18.2" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
        </svg>
      );

    case 'api-tool-sms':
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="#081322" />
          <rect x="8.5" y="10.5" width="23" height="15.5" rx="4.5" fill="#0EA5E9" opacity="0.22" stroke="#38BDF8" strokeWidth="2" />
          <circle cx="15" cy="18.2" r="1.5" fill="#38BDF8" />
          <circle cx="20" cy="18.2" r="1.5" fill="#38BDF8" />
          <circle cx="25" cy="18.2" r="1.5" fill="#38BDF8" />
          <path d="M14.5 26L13 30.5L19 26" fill="#38BDF8" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id={gradA} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="55%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
            <linearGradient id={gradB} x1="20" y1="8" x2="20" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" rx="10" fill="#080F1D" />
          <polygon points="20,7.5 31,14 31,26 20,32.5 9,26 9,14" fill={`url(#${gradA})`} opacity="0.92" />
          <polygon points="20,7.5 31,14 20,20 9,14" fill={`url(#${gradB})`} />
          <path d="M20 20V32.5M9 14L20 20L31 14" stroke="#E0F2FE" strokeWidth="1.2" opacity="0.6" />
        </svg>
      );
  }
}

export const BrandIcon = React.memo(function BrandIcon({
  slug,
  name,
  iconPath,
  size = 'md',
  laser = true,
  active = false,
  className = '',
}: BrandIconProps) {
  const uid = useId().replace(/:/g, '');
  const brandKey = resolveBrandKey(slug, name, iconPath);

  const normalizedIconPath = (iconPath || '').trim();
  const isGenericFallbackIcon =
    PLACEHOLDER_PATHS.has(normalizedIconPath) ||
    (normalizedIconPath === '/assets/icons/products/chatgpt.jpg' && brandKey !== 'chatgpt');

  const resolvedSrc = !isGenericFallbackIcon
    ? normalizedIconPath
    : PUBLIC_ICON_MAP[brandKey] || '';

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [resolvedSrc]);

  const sizeClass =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'lg'
      ? 'w-11 h-11'
      : 'w-10 h-10';

  const frameClass = `${
    laser ? 'icon-beam-box icon-laser-sweep' : ''
  } ${active ? 'active' : ''} ${sizeClass} rounded-xl overflow-hidden bg-[#07090E] border border-white/[0.12] shrink-0 flex items-center justify-center relative ${className}`.trim();

  if (resolvedSrc && !imgError) {
    return (
      <div className={frameClass}>
        <img
          src={resolvedSrc}
          alt={name || slug || 'Dịch vụ'}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={frameClass} aria-label={name || slug || 'Dịch vụ'}>
      <BrandVectorSvg brandKey={brandKey} uid={uid} />
    </div>
  );
});
