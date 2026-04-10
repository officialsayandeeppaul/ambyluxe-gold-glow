import { StaticContentPage } from '@/components/static/StaticContentPage';

const Faqs = () => (
  <StaticContentPage
    variant="cards"
    eyebrow="Support"
    title="FAQs"
    subtitle="Quick answers to common questions about orders, shipping, payments, and product care."
    sections={[
      {
        title: 'How long does delivery take?',
        body: [
          'Most domestic orders are delivered within 3-7 business days after confirmation.',
          'Delivery ETA can vary during festive periods or due to courier constraints.',
        ],
      },
      {
        title: 'Can I track my order?',
        body: [
          'Yes. After your order is processed, tracking updates are visible in your account orders section.',
          'You also receive key updates through in-app notifications.',
        ],
      },
      {
        title: 'Do you offer returns?',
        body: [
          'Please review the Refund Policy for detailed return and exchange eligibility.',
          'Custom-made and personalized items may be non-returnable unless damaged or incorrect.',
        ],
      },
      {
        title: 'Which payment methods are supported?',
        body: [
          'You can complete checkout using online payment options supported on the payment screen.',
          'All successful payments receive immediate order confirmation.',
        ],
      },
    ]}
  />
);

export default Faqs;
