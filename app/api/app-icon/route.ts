import { ImageResponse } from "next/og";
import { createElement } from "react";

export function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("size"));
  const size = [180, 192, 512].includes(requested) ? requested : 192;
  return new ImageResponse(createElement("div", {
    style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#17382f" },
  }, createElement("div", {
    style: { width: size * 0.58, height: size * 0.58, display: "flex", alignItems: "center", justifyContent: "center", border: `${size * 0.009}px solid #d6bc82`, borderRadius: "50%", position: "relative" },
  }, createElement("div", { style: { position: "absolute", width: size * 0.04, height: size * 0.35, background: "#d6bc82", borderRadius: size * 0.012 } }),
  createElement("div", { style: { position: "absolute", width: size * 0.23, height: size * 0.04, top: size * 0.20, background: "#d6bc82", borderRadius: size * 0.012 } }))),
  { width: size, height: size, headers: { "Cache-Control": "public, max-age=31536000, immutable" } });
}
