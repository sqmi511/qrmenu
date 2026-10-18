const base = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const origin = new URL(base, window.location.origin).origin;

/** Uploaded images are stored as /uploads/..., served by the API origin. */
export const assetUrl = (u?: string) => (u && u.startsWith("/uploads/") ? origin + u : u);