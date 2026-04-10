import { StaticContentPage } from '@/components/static/StaticContentPage';

const Press = () => (
  <StaticContentPage
    variant="cards"
    eyebrow="Company"
    title="Press"
    subtitle="Media and collaboration information for Amby Luxe."
    sections={[
      {
        title: 'Brand profile',
        body: [
          'Amby Luxe creates fine jewellery rooted in craft, detail, and timeless aesthetics.',
          'Our collections blend modern silhouettes with classic materials and finishing.',
        ],
      },
      {
        title: 'Media enquiries',
        body: [
          'For interviews, editorials, and brand features, please contact our support team via the Contact page.',
          'Include publication name, timeline, and collaboration scope for faster response.',
        ],
      },
      {
        title: 'Assets and usage',
        body: [
          'Brand assets and product images may require permission before editorial or commercial publication.',
          'Please request approved media material for accurate representation.',
        ],
      },
    ]}
  />
);

export default Press;
