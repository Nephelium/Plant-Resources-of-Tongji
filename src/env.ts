export const STATIC_MODE = import.meta.env.VITE_STATIC_MODE === "true";
export const BASE_URL = import.meta.env.BASE_URL || "/";
export const ASSET_BASE = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
