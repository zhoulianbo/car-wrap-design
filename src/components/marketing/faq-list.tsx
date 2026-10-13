import { ChevronDown } from 'lucide-react';

export function FAQList({
  items,
}: {
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <div className="mt-12 grid gap-3">
      {items.map((item, index) => (
        <details
          key={item.question}
          open={index === 0}
          className="group rounded-2xl border border-white/10 bg-white/[0.035] px-6 py-5 open:border-emerald-300/25"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-semibold text-white marker:hidden [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              aria-hidden="true"
              className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            />
          </summary>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
