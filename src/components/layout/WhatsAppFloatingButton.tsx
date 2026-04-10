import { MessageCircle } from 'lucide-react';

function whatsappLink(): string {
  const raw = import.meta.env.VITE_WHATSAPP_NUMBER?.trim() || '';
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  const message =
    import.meta.env.VITE_WHATSAPP_MESSAGE?.trim() ||
    'Hi Amby Luxe, I need help with my order.';
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

export function WhatsAppFloatingButton() {
  const href = whatsappLink();
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
      className="fixed right-5 bottom-20 md:bottom-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_28px_rgba(37,211,102,0.38)] hover:brightness-105 active:scale-95 transition"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
