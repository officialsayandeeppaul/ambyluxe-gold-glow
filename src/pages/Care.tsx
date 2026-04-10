import { StaticContentPage } from '@/components/static/StaticContentPage';

const Care = () => (
  <StaticContentPage
    variant="classic"
    eyebrow="Support"
    title="Care Instructions"
    subtitle="Simple care steps to keep your jewellery brilliant for years."
    sections={[
      {
        title: 'Daily handling',
        body: [
          'Store pieces separately in soft-lined boxes or pouches to avoid scratches.',
          'Avoid direct contact with perfume, hairspray, lotion, or harsh cleaning chemicals.',
        ],
      },
      {
        title: 'Cleaning routine',
        body: [
          'Clean gently with a soft microfiber cloth after wear.',
          'For deeper cleaning, use mild soap and lukewarm water, then dry thoroughly.',
        ],
      },
      {
        title: 'When to remove jewellery',
        body: [
          'Remove jewellery before workouts, swimming, showering, or heavy manual activity.',
          'Avoid impact exposure to preserve stone settings and finish quality.',
        ],
      },
      {
        title: 'Professional maintenance',
        body: [
          'Periodically inspect prongs and clasps to ensure long-term durability.',
          'For polishing or servicing guidance, contact our support team.',
        ],
      },
    ]}
  />
);

export default Care;
