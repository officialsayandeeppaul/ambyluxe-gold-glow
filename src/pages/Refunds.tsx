import { StaticContentPage } from '@/components/static/StaticContentPage';

const Refunds = () => (
  <StaticContentPage
    variant="cards"
    eyebrow="Billing"
    title="Payments Policy"
    subtitle="Clear payment terms for all orders placed on Amby Luxe."
    sections={[
      {
        title: 'Pay-in only model',
        body: [
          'Orders are processed on successful pay-in against the checkout total shown before confirmation.',
          'This storefront follows a pay-in model and does not support direct customer payout workflows.',
        ],
      },
      {
        title: 'Order amount finalization',
        body: [
          'The final payable amount is confirmed at checkout after pricing, offers, and shipping logic are applied.',
          'Once payment succeeds and the order is confirmed, fulfillment processing begins.',
        ],
      },
      {
        title: 'Failed or cancelled payment',
        body: [
          'If payment fails or is not completed, the order is not confirmed and no fulfillment action starts.',
          'You can retry checkout with a valid payment method to place the order successfully.',
        ],
      },
      {
        title: 'Need billing help',
        body: [
          'For billing clarifications, contact support with your order id and registered contact details.',
          'Our team will validate transaction context and guide you with next steps.',
        ],
      },
    ]}
  />
);

export default Refunds;
