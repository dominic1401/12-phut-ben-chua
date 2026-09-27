import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { brandIconUrl } from "@/lib/brand.mjs";
import "./globals.css";
import "./ux.css";

const prayerFont = localFont({
  src: "../public/fonts/NotoSerif-Vietnamese.woff2",
  variable: "--font-prayer-face", weight: "400 800", style: "normal",
  display: "swap", preload: true, adjustFontFallback: false,
});
const interfaceFont = localFont({
  src: "../public/fonts/NotoSans-Vietnamese.woff2",
  variable: "--font-ui-face", weight: "400 800", style: "normal",
  display: "swap", preload: true, adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "12 Phút Bên Chúa",
  description:
    "Dành 12 phút mỗi ngày để lắng nghe Lời Chúa, suy niệm và cầu nguyện theo phương pháp Lectio Divina.",
  other: {
    "codex-preview": "development",
  },
  appleWebApp: { capable: true, title: "Bên Chúa", statusBarStyle: "default" },
  icons: {
    icon: [32, 64].map(size => ({ url: brandIconUrl(size), sizes: `${size}x${size}`, type: "image/png" })),
    apple: { url: brandIconUrl(180), sizes: "180x180", type: "image/png" },
  },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f3efe5" }, { media: "(prefers-color-scheme: dark)", color: "#14221e" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${prayerFont.variable} ${interfaceFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=JSON.parse(localStorage.getItem('12-phut-ben-chua:preferences:v1')||'{}');document.documentElement.dataset.theme=p.theme==='dark'||(p.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';if(['normal','large','largest'].includes(p.fontSize))document.documentElement.dataset.fontSize=p.fontSize;}catch(e){}})();` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
