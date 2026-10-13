import { m } from '@/paraglide/messages.js';
import { CreditPacks } from '@/blocks/credit-packs';

export function Pricing({ title }: { title?: string } = {}) {
  return (
    <section id="pricing" className="px-4 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-xs font-semibold tracking-[.22em] uppercase">
            {m['landing.pricing.eyebrow']()}
          </p>
          <h1 className="font-headline mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">
            {title ?? m['landing.pricing.title']()}
          </h1>
          <p className="text-muted-foreground mt-5 text-base leading-7">
            {m['landing.pricing.intro']()}
          </p>
        </div>
        <div className="mt-14">
          <CreditPacks />
        </div>
        <p className="text-muted-foreground mx-auto mt-8 max-w-3xl text-center text-xs leading-6">
          {m['landing.pricing.footer']()}
        </p>
      </div>
    </section>
  );
}
