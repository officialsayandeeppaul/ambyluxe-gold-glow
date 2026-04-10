import { Layout } from '@/components/layout/Layout';

type StaticSection = {
  title: string;
  body: string[];
};

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: StaticSection[];
  variant?: 'classic' | 'split' | 'cards' | 'editorial';
};

export function StaticContentPage({
  eyebrow,
  title,
  subtitle,
  sections,
  variant = 'classic',
}: Props) {
  const wrapperClass =
    variant === 'editorial'
      ? 'pt-32 pb-24'
      : variant === 'split'
        ? 'pt-28 md:pt-32 pb-24 bg-background-elevated/20'
        : 'pt-28 md:pt-32 pb-24';

  const sectionWrapClass =
    variant === 'cards'
      ? 'mt-10 grid md:grid-cols-2 gap-5'
      : variant === 'split'
        ? 'mt-10 space-y-0 divide-y divide-border/30 rounded-sm border border-border/30 overflow-hidden'
        : 'mt-10 space-y-5';

  const cardClass =
    variant === 'editorial'
      ? 'border-l-2 border-primary/40 pl-5 py-3'
      : variant === 'cards'
        ? 'rounded-sm border border-border/35 bg-background-elevated/35 p-6'
        : variant === 'split'
          ? 'bg-background/80 p-6'
          : 'rounded-sm border border-border/35 bg-background-elevated/30 p-6';

  return (
    <Layout>
      <section className={wrapperClass}>
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-[10px] uppercase tracking-[0.45em] text-primary/75 mb-3">{eyebrow}</p>
          <h1
            className={`font-display font-medium mb-4 ${
              variant === 'editorial' ? 'text-5xl md:text-6xl' : 'text-4xl md:text-5xl'
            }`}
          >
            {title}
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">{subtitle}</p>

          <div className={sectionWrapClass}>
            {sections.map((section) => (
              <article key={section.title} className={cardClass}>
                <h2 className="text-xl font-display font-medium mb-3">{section.title}</h2>
                <div className="space-y-2">
                  {section.body.map((line, idx) => (
                    <p key={`${section.title}-${idx}`} className="text-sm text-muted-foreground leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
