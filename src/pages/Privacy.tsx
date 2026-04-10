import { StaticContentPage } from '@/components/static/StaticContentPage';

const Privacy = () => (
  <StaticContentPage
    variant="split"
    eyebrow="Legal"
    title="Privacy Policy"
    subtitle="How we collect, use, and protect your personal information."
    sections={[
      {
        title: 'Information we collect',
        body: [
          'We collect details necessary to process orders, deliver products, and provide support.',
          'This can include contact data, delivery address, and transaction-related information.',
        ],
      },
      {
        title: 'How we use data',
        body: [
          'Your information is used to fulfill orders, share order updates, and improve service quality.',
          'With consent, we may also use contact details for newsletters and promotional communication.',
        ],
      },
      {
        title: 'Data security',
        body: [
          'We use reasonable safeguards to protect your account and transaction information.',
          'Access is restricted to authorized processes and support operations.',
        ],
      },
      {
        title: 'Your choices',
        body: [
          'You can contact us to update account details or unsubscribe from promotional communication.',
          'Policy updates may be published on this page as business or legal requirements evolve.',
        ],
      },
    ]}
  />
);

export default Privacy;
