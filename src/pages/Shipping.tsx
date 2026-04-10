import { StaticContentPage } from '@/components/static/StaticContentPage';

const Shipping = () => (
  <StaticContentPage
    variant="split"
    eyebrow="Support"
    title="Shipping & Returns"
    subtitle="Delivery, handling, and return flow for all Amby Luxe purchases."
    sections={[
      {
        title: 'Shipping coverage',
        body: [
          'We currently support domestic delivery locations in India.',
          'Some locations may have limited courier service windows based on PIN verification.',
        ],
      },
      {
        title: 'Dispatch timeline',
        body: [
          'In-stock items are dispatched after successful payment verification and quality checks.',
          'Crafted-to-order pieces may require extra preparation time before dispatch.',
        ],
      },
      {
        title: 'Returns and exchanges',
        body: [
          'Eligible requests should be raised promptly with order details and reason.',
          'Items must be unused, in original condition, and include packaging/certificates where applicable.',
        ],
      },
      {
        title: 'Damaged or incorrect item',
        body: [
          'If you receive a damaged or incorrect product, contact support immediately with photos and order id.',
          'Our team will assist with verification and resolution on priority.',
        ],
      },
    ]}
  />
);

export default Shipping;
