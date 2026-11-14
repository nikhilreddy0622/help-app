export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '';

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

/** Opens Razorpay checkout. Throws a readable Error in Expo Go (no native module) or when the user dismisses. */
export async function openRazorpaySubscription(opts: {
  keyId: string; subscriptionId: string; name: string; description: string;
  prefill?: { email?: string; contact?: string; name?: string };
}): Promise<RazorpaySuccess> {
  let Checkout: { open: (o: Record<string, unknown>) => Promise<RazorpaySuccess> } | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Checkout = require('react-native-razorpay').default;
  } catch {
    Checkout = undefined;
  }
  if (!Checkout || typeof Checkout.open !== 'function') {
    throw new Error('Payments need the development build of the app. Expo Go does not include the Razorpay module.');
  }
  try {
    return await Checkout.open({
      key: opts.keyId || RAZORPAY_KEY_ID, subscription_id: opts.subscriptionId, name: opts.name,
      description: opts.description, prefill: opts.prefill, theme: { color: '#0F766E' },
    });
  } catch (e) {
    const err = e as { description?: string };
    throw new Error(err?.description ?? 'Payment was not completed.');
  }
}
