import { CarFront, Download, Usb } from 'lucide-react';

import { m } from '@/paraglide/messages.js';

export function TeslaWrapInstructions() {
  return (
    <section className="mt-14 rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:p-8">
      <h2 className="flex items-center gap-3 text-xl font-semibold">
        <CarFront className="size-5 text-emerald-300" />
        {m['detail.tesla_title']()}
      </h2>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-400">
        {m['detail.tesla_intro']()}
      </p>
      <div className="mt-7 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Download className="size-4 text-emerald-300" />
            {m['detail.tesla_steps_title']()}
          </h3>
          <ol className="mt-5 space-y-4">
            {[
              m['detail.tesla_step1'](),
              m['detail.tesla_step2'](),
              m['detail.tesla_step3'](),
            ].map((step, index) => (
              <li
                key={step}
                className="flex gap-3 text-sm leading-6 text-slate-300"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-300/10 text-xs text-emerald-300">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Usb className="size-4 text-emerald-300" />
            {m['detail.tesla_usb_title']()}
          </h3>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
            {[
              m['detail.tesla_usb'](),
              m['detail.tesla_files'](),
              m['detail.tesla_mobile'](),
            ].map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-7 border-t border-white/10 pt-5 text-xs leading-6 text-slate-400">
        <p>{m['detail.tesla_check']()}</p>
        <a
          href="https://github.com/teslamotors/custom-wraps#requirements--setup"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-emerald-300 underline underline-offset-4"
        >
          {m['detail.tesla_source']()}
        </a>
      </div>
    </section>
  );
}
