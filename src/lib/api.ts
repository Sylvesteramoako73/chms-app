// Base URL for the WhatsApp/SMS server.
// In development, leave VITE_API_URL unset — Vite's proxy forwards /api/* to localhost:3001.
// In production (Netlify), set VITE_API_URL to your hosted server URL, e.g. https://your-server.railway.app
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
