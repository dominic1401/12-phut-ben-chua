import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "12 Phút Bên Chúa", short_name: "Bên Chúa", lang: "vi",
    description: "Dành ít phút mỗi ngày để đọc Lời Chúa, suy niệm và cầu nguyện.",
    start_url: "/", scope: "/", display: "standalone",
    background_color: "#f3efe5", theme_color: "#17382f",
    icons: [
      ...[192, 512].map(size => ({
        src: `/api/app-icon?size=${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" as const,
      })),
      { src: "/api/app-icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
