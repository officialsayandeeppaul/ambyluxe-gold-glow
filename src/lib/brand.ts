/** Storefront display name — SMS branding is set in Twilio Verify Service (Friendly name). */
export const BRAND_NAME = 'Amby Luxe Jewels';

export function toastOtpSent(): string {
  return `${BRAND_NAME} — A verification code has been sent to your mobile number. Please check your SMS.`;
}
