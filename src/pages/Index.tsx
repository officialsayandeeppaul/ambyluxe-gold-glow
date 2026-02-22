import { Layout } from '@/components/layout/Layout';
import { Hero } from '@/components/home/Hero';
import { EditorialSection } from '@/components/home/EditorialSection';
import { MarqueeSection } from '@/components/home/MarqueeSection';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { Collections } from '@/components/home/Collections';
import { CraftsmanshipSection } from '@/components/home/CraftsmanshipSection';
import { Testimonials } from '@/components/home/Testimonials';
import { FinalCTA } from '@/components/home/FinalCTA';

const Index = () => {
  return (
    <Layout>
      <Hero />
      <MarqueeSection />
      <EditorialSection />
      <FeaturedProducts />
      <Collections />
      <CraftsmanshipSection />
      <Testimonials />
      <FinalCTA />
    </Layout>
  );
};

export default Index;
