// Paystack checkout via Paystack's own inline script (replaces react-paystack,
// which doesn't support React 19 and broke `npm install` on Vercel).

interface PaystackSetup {
  key: string;
  email: string;
  amount: number; // pesewas
  currency: string;
  ref: string;
  metadata?: Record<string, unknown>;
  callback: (res: { reference: string }) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop?: { setup(cfg: PaystackSetup): { openIframe(): void } };
  }
}

let loading: Promise<void> | null = null;

function loadPaystack(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error('Could not load Paystack. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Open the Paystack payment popup. Resolves once it is open. */
export async function openPaystack(cfg: PaystackSetup): Promise<void> {
  await loadPaystack();
  // Paystack rejects async functions as callbacks, so wrap them in plain ones
  window.PaystackPop!.setup({
    ...cfg,
    callback: res => { cfg.callback(res); },
    onClose: () => { cfg.onClose(); },
  }).openIframe();
}
