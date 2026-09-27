import { brandIconUrl } from "@/lib/brand.mjs";

export function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand-emblem${large ? " brand-emblem-large" : ""}`} aria-hidden="true">
      <img src={brandIconUrl(large ? 192 : 128, "mark")} width={large ? 88 : 56} height={large ? 88 : 56} alt="" decoding="async" />
    </span>
  );
}
