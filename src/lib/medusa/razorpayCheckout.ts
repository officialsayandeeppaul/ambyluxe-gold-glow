/** Medusa payment provider id for @sgftech/payment-razorpay (`pp_{identifier}_{configId}`). */
export const RAZORPAY_PAYMENT_PROVIDER_ID = 'pp_razorpay_razorpay';

/** Fields so POST payment-sessions / cart retrieve include Razorpay order `data` (order id, amount). */
export const PAYMENT_COLLECTION_QUERY_FIELDS =
  'id,currency_code,amount,status,*payment_sessions,payment_sessions.data,payment_sessions.*';

type SessionLike = { provider_id?: string | null; data?: unknown };

/**
 * Pick the Razorpay session — not always `payment_sessions[0]` (failed / other providers may exist).
 */
export function pickRazorpayPaymentSession(
  paymentCollection: { payment_sessions?: SessionLike[] | null } | null | undefined,
): SessionLike | undefined {
  const sessions = paymentCollection?.payment_sessions ?? [];
  return (
    sessions.find((s) => s.provider_id === RAZORPAY_PAYMENT_PROVIDER_ID) ??
    sessions.find((s) => s.provider_id?.includes('razorpay')) ??
    sessions[0]
  );
}

/**
 * Razorpay order is stored on the session `data` (spread from orders.create + intentRequest).
 * On provider failure the plugin may persist `{ error, code, detail }` instead of an order payload.
 */
export function parseRazorpayOrderFromSessionData(data: unknown): {
  orderId: string | undefined;
  amount: number | undefined;
  currency: string | undefined;
  /** Set when @sgftech/payment-razorpay returned buildError (e.g. Razorpay API rejected orders.create). */
  providerError?: string;
} {
  if (data == null) return { orderId: undefined, amount: undefined, currency: undefined };
  let obj: Record<string, unknown>;
  if (typeof data === 'string') {
    try {
      obj = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return { orderId: undefined, amount: undefined, currency: undefined };
    }
  } else if (typeof data === 'object') {
    obj = data as Record<string, unknown>;
  } else {
    return { orderId: undefined, amount: undefined, currency: undefined };
  }
  if (typeof obj.error === 'string') {
    const detail = typeof obj.detail === 'string' ? obj.detail : '';
    return {
      orderId: undefined,
      amount: undefined,
      currency: undefined,
      providerError: detail ? `${obj.error}\n${detail}` : obj.error,
    };
  }
  const id = obj.id ?? obj.order_id;
  const orderId = typeof id === 'string' ? id : undefined;
  const amount = typeof obj.amount === 'number' ? obj.amount : undefined;
  const currency = typeof obj.currency === 'string' ? obj.currency : undefined;
  return { orderId, amount, currency };
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

export function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-razorpay-checkout]',
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.Razorpay) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Razorpay script failed')));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.dataset.razorpayCheckout = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Razorpay script failed to load'));
    document.body.appendChild(s);
  });
}
