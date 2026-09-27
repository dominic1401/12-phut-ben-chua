// Keep every logo URL versioned so an installed app can replace its old icon.
export const BRAND_VERSION = "chi-rho-clock-v1";
export const BRAND_IMAGE_PATH = "/brand/chi-rho-clock-v1.png";

/** @param {number} size @param {"app" | "mark"} [variant] */
export function brandIconUrl(size, variant = "app") {
  return `/api/app-icon?size=${size}&variant=${variant}&v=${BRAND_VERSION}`;
}

export const BRAND_OFFLINE_ASSETS = [
  ...[32, 64, 180, 192, 512].map(size => brandIconUrl(size)),
  brandIconUrl(128, "mark"),
  brandIconUrl(192, "mark"),
];
