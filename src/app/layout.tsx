import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://yukishopmxh.vn')
  ),
  title: 'YukiShopMXH — Hệ Sinh Thái Dịch Vụ Số & Mạng Xã Hội',
  description:
    'YukiShopMXH — Nền tảng thương mại dịch vụ số, tài khoản bản quyền chính chủ, tăng tương tác mạng xã hội và nạp ví VietQR đối soát tự động.',
  icons: {
    icon: '/assets/images/logo.png',
    apple: '/assets/images/logo.png',
  },
  openGraph: {
    title: 'YukiShopMXH — Hệ Sinh Thái Dịch Vụ Số & Mạng Xã Hội',
    description:
      'Tài khoản bản quyền chính chủ, tăng tương tác MXH đa nền tảng, bảo hành minh bạch và thanh toán VietQR an toàn.',
    images: ['/assets/images/hero-banner.png'],
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark overflow-x-hidden max-w-full">
      <head>
        <meta name="theme-color" content="#07090E" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#07090E] text-[#F8FAFC] min-h-screen flex flex-col antialiased overflow-x-hidden max-w-full relative">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
