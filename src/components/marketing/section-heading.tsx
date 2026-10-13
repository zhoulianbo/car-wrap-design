import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' && 'mx-auto text-center',
        className
      )}
    >
      {eyebrow ? (
        <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-emerald-300 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-headline text-3xl leading-tight font-semibold tracking-tight text-white sm:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
