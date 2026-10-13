import {
  Bot,
  Boxes,
  Download,
  Layers3,
  Palette,
  WandSparkles,
} from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { SectionHeading } from '@/components/marketing/section-heading';

const features = [
  {
    title: () => m['landing.features.viewer.title'](),
    description: () => m['landing.features.viewer.description'](),
    icon: Boxes,
  },
  {
    title: () => m['landing.features.ai.title'](),
    description: () => m['landing.features.ai.description'](),
    icon: Bot,
  },
  {
    title: () => m['landing.features.editor.title'](),
    description: () => m['landing.features.editor.description'](),
    icon: Layers3,
  },
  {
    title: () => m['landing.features.materials.title'](),
    description: () => m['landing.features.materials.description'](),
    icon: Palette,
  },
  {
    title: () => m['landing.features.remix.title'](),
    description: () => m['landing.features.remix.description'](),
    icon: WandSparkles,
  },
  {
    title: () => m['landing.features.export.title'](),
    description: () => m['landing.features.export.description'](),
    icon: Download,
  },
];

export function Features() {
  return (
    <section id="why-use-us" className="py-16">
      <div className="page-container">
        <SectionHeading
          eyebrow={m['landing.features.eyebrow']()}
          title={m['landing.features.title']()}
          description={m['landing.features.description']()}
        />
        <div className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {features.map(({ title, description, icon: Icon }) => (
            <article
              key={title()}
              className="relative border-t border-white/10 pt-6 pl-16"
            >
              <div className="absolute top-6 left-0 flex size-10 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-300">
                <Icon className="size-6" strokeWidth={1.6} />
              </div>
              <h3 className="text-xl font-semibold text-white">{title()}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {description()}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
