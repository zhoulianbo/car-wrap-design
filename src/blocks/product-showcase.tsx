import {
  ArrowRight,
  Bot,
  Layers3,
  MousePointer2,
  Orbit,
  Palette,
  Sparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { VEHICLE_ASSET_MANIFEST } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import { SectionHeading } from '@/components/marketing/section-heading';
import { buttonVariants } from '@/components/ui/button';

const finishes = [
  [
    () => m['viewer.finish.gloss'](),
    'bg-gradient-to-br from-slate-100 via-slate-400 to-slate-900',
  ],
  [
    () => m['viewer.finish.satin'](),
    'bg-gradient-to-br from-slate-300 via-slate-500 to-slate-800',
  ],
  [() => m['viewer.finish.matte'](), 'bg-[#30343b]'],
  [
    () => m['viewer.finish.metallic'](),
    'bg-[radial-gradient(circle_at_30%_25%,#d9e4ee,#52606d_42%,#111827)]',
  ],
  [
    () => m['viewer.finish.pearlescent'](),
    'bg-[conic-gradient(from_25deg,#9ffbd5,#8ec5ff,#e1a7ff,#fff2b2,#9ffbd5)]',
  ],
] as const;

export function ProductShowcase() {
  return (
    <>
      <WrapEditorShowcase />
      <AiGeneratorShowcase />
      <MaterialShowcase />
      <WorkflowShowcase />
      <VehicleShowcase />
    </>
  );
}

export function WrapEditorShowcase() {
  return (
    <section id="create-wrap" className="py-16 sm:py-20">
      <div className="page-container">
        <SectionHeading
          title={m['landing.showcase.title']()}
          description={m['landing.showcase.description']()}
        />
        <figure className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#10151d]">
          <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Layers3 className="size-4 text-emerald-300" />
              {m['landing.showcase.example_name']()}{' '}
              <span className="text-slate-600">/</span> Model 3
            </span>
            <span>{m['landing.showcase.static_note']()}</span>
          </figcaption>
          <div className="grid md:grid-cols-[1fr_1.1fr]">
            <div className="flex min-w-0 flex-col border-b border-white/10 p-5 sm:p-7 md:border-r md:border-b-0">
              <p className="mb-5 text-xs text-slate-400">
                {m['landing.showcase.editor_label']()}
              </p>
              <div className="relative flex flex-1 items-center justify-center px-12 py-5">
                <div
                  aria-hidden="true"
                  className="absolute left-0 flex flex-col gap-5 rounded-xl bg-white/5 p-3 text-slate-500"
                >
                  {[MousePointer2, Layers3, Palette, Sparkles].map(
                    (Icon, i) => (
                      <Icon key={i} className="size-4" />
                    )
                  )}
                </div>
                <img
                  src="/imgs/showcase/editor-texture.webp"
                  alt={m['landing.showcase.texture_alt']()}
                  width={640}
                  height={640}
                  loading="lazy"
                  className="aspect-square w-full max-w-80 min-w-0 rounded-lg object-contain"
                />
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] text-slate-400">
                {[
                  m['landing.showcase.layer_artwork'](),
                  m['landing.showcase.layer_color'](),
                  m['landing.showcase.layer_finish'](),
                ].map((label) => (
                  <span
                    key={label}
                    className="rounded-md border border-white/10 px-3 py-1.5"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col bg-[#0b1016] p-5 sm:p-7">
              <p className="text-xs text-slate-400">
                {m['landing.showcase.preview_label']()}
              </p>
              <div className="flex flex-1 items-center justify-center py-5">
                <img
                  src="/imgs/showcase/editor-preview.webp"
                  alt={m['landing.showcase.preview_alt']()}
                  width={800}
                  height={480}
                  loading="lazy"
                  className="aspect-[5/3] w-full object-contain"
                />
              </div>
              <p className="text-center text-xs leading-6 text-slate-500">
                {m['landing.showcase.viewer_note']()}
              </p>
            </div>
          </div>
        </figure>
        <div className="mt-7 text-center">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300"
          >
            {m['landing.showcase.cta']()}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function AiGeneratorShowcase() {
  const promptTags = [
    m['landing.ai.tag_technical'](),
    m['landing.ai.tag_minimal'](),
    m['landing.ai.tag_graphite'](),
    m['landing.ai.tag_results'](),
  ];
  return (
    <section
      id="ai-generator"
      className="border-y border-white/5 bg-[#0a0e16] py-16"
    >
      <div className="page-container grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <p className="mb-4 text-xs font-semibold tracking-[.22em] text-emerald-300 uppercase">
            {m['landing.ai.eyebrow']()}
          </p>
          <h2 className="font-headline text-4xl leading-tight font-semibold tracking-tight text-white sm:text-5xl">
            {m['landing.ai.title']()}
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
            {m['landing.ai.description']()}
          </p>
          <Link
            href="/ai-car-wrap-generator"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-8 rounded-xl bg-emerald-300 text-[#04110b] hover:bg-emerald-200'
            )}
          >
            {m['landing.ai.cta']()} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5 shadow-2xl sm:p-8">
          <div className="flex items-center gap-3 border-b border-white/10 pb-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-300">
              <Bot className="size-5" />
            </div>
            <div>
              <p className="font-headline text-sm font-semibold text-white">
                {m['landing.ai.prompt_label']()}
              </p>
              <p className="text-xs text-slate-500">
                FLUX 2 Pro · {m['landing.ai.square_texture']()}
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#070b11] p-5 text-sm leading-7 text-slate-300">
            {m['landing.ai.prompt_example']()}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {promptTags.map((item) => (
              <span
                key={item}
                className="rounded-lg border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-slate-400"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function MaterialShowcase() {
  return (
    <section className="py-16">
      <div className="page-container">
        <SectionHeading
          title={m['landing.materials.title']()}
          description={m['landing.materials.description']()}
        />
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-5">
          {finishes.map(([name, visual]) => (
            <article
              key={name()}
              className="rounded-2xl border border-white/10 bg-white/[.03] p-3"
            >
              <div
                className={cn(
                  'aspect-[4/3] rounded-xl border border-white/10 shadow-inner',
                  visual
                )}
              />
              <h3 className="font-headline mt-4 px-1 text-sm font-semibold text-white">
                {name()}
              </h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WorkflowShowcase() {
  return (
    <section
      id="how-to-use"
      className="border-y border-white/5 bg-[#0a0e16] py-16 sm:py-20"
    >
      <div className="page-container">
        <SectionHeading
          eyebrow={m['landing.workflow.eyebrow']()}
          title={m['landing.workflow.title']()}
        />
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            [
              m['landing.workflow.choose.title'](),
              m['landing.workflow.choose.description'](),
            ],
            [
              m['landing.workflow.create.title'](),
              m['landing.workflow.create.description'](),
            ],
            [
              m['landing.workflow.review.title'](),
              m['landing.workflow.review.description'](),
            ],
          ].map(([title, description], index) => (
            <article
              key={title}
              className="rounded-3xl border border-white/10 bg-white/[.035] p-7"
            >
              <span className="font-headline text-5xl font-semibold text-emerald-300/30">
                0{index + 1}
              </span>
              <h3 className="font-headline mt-7 text-xl font-semibold text-white">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VehicleShowcase() {
  return (
    <section id="popular-cars" className="py-16 sm:py-20">
      <div className="page-container">
        <SectionHeading
          title={m['landing.vehicles.title']()}
          description={m['landing.vehicles.description']()}
        />
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {VEHICLE_ASSET_MANIFEST.map((vehicle) => (
            <Link
              key={vehicle.slug}
              href={`/create/${vehicle.slug}`}
              className="group min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#111923] transition-colors hover:border-emerald-300/40 hover:bg-[#17242d] focus-visible:outline-2 focus-visible:outline-emerald-300"
            >
              <img
                src={`/imgs/vehicles/cards/${vehicle.slug}.webp`}
                alt={`${vehicle.trim} ${vehicle.year}`}
                width={640}
                height={360}
                loading="lazy"
                className="aspect-[2/1] w-full object-contain px-2 pt-2 transition-transform duration-300 group-hover:scale-105"
              />
              <div className="px-4 pt-1 pb-5">
                <h3 className="text-sm font-semibold text-white sm:text-base">
                  {vehicle.trim}
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  {vehicle.brand} · {vehicle.year}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-semibold text-emerald-300">
          <Link href="/tesla-model-3-wrap">
            {m['landing.vehicles.model_3_link']()}
          </Link>
          <Link href="/tesla-model-y-wrap">
            {m['landing.vehicles.model_y_link']()}
          </Link>
        </div>
      </div>
    </section>
  );
}
