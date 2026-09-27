import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ux.css";

export const metadata: Metadata = {
  title: "12 Phút Bên Chúa",
  description:
    "Một khoảng lặng 12 phút mỗi ngày để cầu nguyện với Lời Chúa theo phương pháp Lectio Divina.",
  other: {
    "codex-preview": "development",
  },
  appleWebApp: { capable: true, title: "Bên Chúa", statusBarStyle: "default" },
  icons: { icon: "/favicon.svg", apple: "/api/app-icon?size=180" },
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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=JSON.parse(localStorage.getItem('12-phut-ben-chua:preferences:v1')||'{}');document.documentElement.dataset.theme=p.theme==='dark'||(p.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';if(['normal','large','largest'].includes(p.fontSize))document.documentElement.dataset.fontSize=p.fontSize;}catch(e){}})();` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
