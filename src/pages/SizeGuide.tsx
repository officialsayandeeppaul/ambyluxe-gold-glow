import { StaticContentPage } from '@/components/static/StaticContentPage';

const SizeGuide = () => (
  <StaticContentPage
    variant="editorial"
    eyebrow="Support"
    title="Ring Size Guide"
    subtitle="A practical guide to selecting the correct ring size with confidence."
    sections={[
      {
        title: 'How to measure at home',
        body: [
          'Use a thin paper strip or measuring tape around the finger base and note the circumference in mm.',
          'Measure at room temperature and avoid sizing when fingers are unusually cold or warm.',
        ],
      },
      {
        title: 'Best-fit tips',
        body: [
          'Your ring should pass the knuckle with slight resistance and feel secure at the base.',
          'Wider ring bands may require a slightly larger size for comfort.',
        ],
      },
      {
        title: 'Between two sizes?',
        body: [
          'If your measurement sits between sizes, generally choose the larger size for daily comfort.',
          'For surprise gifting, compare with an existing ring worn on the same finger.',
        ],
      },
      {
        title: 'Need help from our team',
        body: [
          'Contact support with your preferred style and approximate measurement.',
          'We can guide you on ideal sizing before you place the order.',
        ],
      },
    ]}
  />
);

export default SizeGuide;
