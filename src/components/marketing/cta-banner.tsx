import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function CTABanner({
  eyebrow,
  title,
  description,
  href,
  label,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <section className="py-16">
      <div className="page-container">
        <div className="border-border/70 relative overflow-hidden rounded-3xl border bg-[linear-gradient(110deg,#171e29,#101720_52%,#18212b)] px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -bottom-32 size-80 rounded-full bg-emerald-300/15 blur-3xl"
          />
          <div className="relative max-w-2xl text-center lg:text-left">
            <p className="text-primary text-xs font-bold tracking-widest uppercase">
              {eyebrow}
            </p>
            <h2 className="font-headline mt-3 text-3xl leading-[1.08] font-semibold tracking-tight text-white sm:text-4xl">
              {title}
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">
              {description}
            </p>
          </div>
          <div className="relative mt-8 flex shrink-0 justify-center lg:mt-0 lg:justify-end">
            <Link
              href={href}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 gap-2 rounded-xl bg-emerald-300 px-8 text-[#04110b] hover:bg-emerald-200'
              )}
            >
              {icon}
              {label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
