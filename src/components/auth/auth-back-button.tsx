import { ArrowLeft } from 'lucide-react';

import { useRouter } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function AuthBackButton() {
  const router = useRouter();

  function handleBack() {
    const state = window.history.state as {
      __TSR_index?: number;
      idx?: number;
    } | null;
    const index = state?.__TSR_index ?? state?.idx;
    if (typeof index === 'number' && index > 0) {
      router.back();
      return;
    }
    router.push('/');
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="text-muted-foreground hover:bg-accent hover:text-foreground fixed top-4 left-4 z-20 inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors sm:top-6 sm:left-6"
    >
      <ArrowLeft className="size-4" />
      {m['common.sign.back']()}
    </button>
  );
}
