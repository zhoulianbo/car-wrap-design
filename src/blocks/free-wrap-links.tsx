import { Link } from '@/core/i18n/navigation';
import type { VehicleSlug } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';

export function FreeWrapLinks({
  vehicleSlug,
  showPrompt = false,
  inline = false,
  onNavigate,
}: {
  vehicleSlug: VehicleSlug;
  showPrompt?: boolean;
  inline?: boolean;
  onNavigate?: () => void;
}) {
  const linkClass =
    'text-emerald-300 underline underline-offset-4 hover:text-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-4';
  const Wrapper = inline ? 'span' : 'p';
  return (
    <Wrapper
      className={
        inline
          ? undefined
          : 'flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm leading-6 text-slate-400'
      }
    >
      {inline && m['free_options.also']()}
      {showPrompt && <span>{m['generator.footnote']()}</span>}
      <Link href="/gallery" className={linkClass} onClick={onNavigate}>
        {m['free_options.download']()}
      </Link>
      {inline && ' '}
      <span>{m['free_options.or']()}</span>
      {inline && ' '}
      <Link
        href={`/create/${vehicleSlug}`}
        className={linkClass}
        onClick={onNavigate}
      >
        {m['free_options.design']()}
      </Link>
    </Wrapper>
  );
}
