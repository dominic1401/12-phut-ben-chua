import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "12 Phút Bên Chúa",
  description:
    "Một khoảng lặng 12 phút mỗi ngày để cầu nguyện với Lời Chúa theo phương pháp Lectio Divina.",
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
