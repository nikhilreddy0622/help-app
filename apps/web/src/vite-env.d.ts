/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
}
interface Window {
  __APP_STATE__?: { rq?: unknown; ssr?: boolean; origin?: string };
  Razorpay?: new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: unknown) => void): void };
  google?: { accounts: { id: {
    initialize(o: { client_id: string; callback: (r: { credential: string }) => void }): void;
    renderButton(el: HTMLElement, o: Record<string, unknown>): void;
  } } };
}
