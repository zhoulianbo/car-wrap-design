import { Sparkles } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { CTABanner } from '@/components/marketing/cta-banner';

export function CTA() {
  return (
    <CTABanner
      eyebrow={m['landing.cta.eyebrow']()}
      title={m['landing.cta.headline']()}
      description={m['landing.cta.subheadline']()}
      href="/ai-car-wrap-generator"
      label={m['landing.cta.ai_button']()}
      icon={<Sparkles aria-hidden="true" className="size-4" />}
    />
  );
}
