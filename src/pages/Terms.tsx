import { StaticContentPage } from '@/components/static/StaticContentPage';

const Terms = () => (
  <StaticContentPage
    variant="editorial"
    eyebrow="Legal"
    title="Terms of Service"
    subtitle="Website usage and purchase terms for Amby Luxe customers."
    sections={[
      {
        title: 'Use of website',
        body: [
          'By using this website, you agree to lawful use and accurate information during checkout.',
          'Any misuse, fraud, or unauthorized activity may lead to account restriction.',
        ],
      },
      {
        title: 'Orders and pricing',
        body: [
          'Orders are subject to stock availability, verification, and successful payment confirmation.',
          'We may update product pricing, catalogue details, and offer conditions without prior notice.',
        ],
      },
      {
        title: 'Intellectual property',
        body: [
          'Design assets, text, visuals, and branding elements on this website are protected property.',
          'Unauthorized reproduction or commercial use is not permitted.',
        ],
      },
      {
        title: 'Liability and updates',
        body: [
          'While we strive for accuracy, occasional typographical or system errors may occur.',
          'These terms can be revised over time and updates become effective once published.',
        ],
      },
    ]}
  />
);

export default Terms;
