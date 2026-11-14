export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID ?? '';
export const isBrowser = typeof window !== 'undefined';
