import { ImageResponse } from "next/og";
import { createElement } from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_IMAGE_PATH, BRAND_VERSION } from "@/lib/brand.mjs";

export const runtime = "nodejs";
let logoSource: Promise<string> | undefined;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const requested = Number(params.get("size"));
  const size = [32, 64, 128, 180, 192, 512].includes(requested) ? requested : 192;
  const transparent = params.get("variant") === "mark";
  // The same approved artwork supplies the header, favicon and installed-app icon.
  logoSource ??= readFile(join(process.cwd(), "public", BRAND_IMAGE_PATH.slice(1)))
    .then(bytes => `data:image/png;base64,${bytes.toString("base64")}`);
  const src = await logoSource;
  // The mark fits within the central 80% safe area for maskable app icons.
  const artSize = transparent ? size : Math.round(size * 0.9);
  return new ImageResponse(createElement("div", {
    style: {
      width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
      background: transparent ? "transparent" : "#f3efe5",
    },
  }, createElement("img", { src, width: artSize, height: artSize, alt: "" })), {
    width: size, height: size,
    headers: { "Cache-Control": params.get("v") === BRAND_VERSION
      ? "public, max-age=31536000, immutable" : "public, max-age=86400" },
  });
}
