import { m } from '@/paraglide/messages.js';
import { FAQList } from '@/components/marketing/faq-list';
import { SectionHeading } from '@/components/marketing/section-heading';

const questions = [
  ['landing.faq.free.question', 'landing.faq.free.answer'],
  ['landing.faq.software.question', 'landing.faq.software.answer'],
  ['landing.faq.how.question', 'landing.faq.how.answer'],
  ['landing.faq.where.question', 'landing.faq.where.answer'],
  ['landing.faq.stack.question', 'landing.faq.stack.answer'],
  ['landing.faq.editing.question', 'landing.faq.editing.answer'],
  ['landing.faq.license.question', 'landing.faq.license.answer'],
] as const;

export function FAQ() {
  return (
    <section id="faq" className="border-t border-white/5 px-4 py-16 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          title={m['landing.faq.title']()}
          description={m['landing.faq.description']()}
        />
        <FAQList
          items={questions.map(([question, answer]) => ({
            question: m[question](),
            answer: m[answer](),
          }))}
        />
      </div>
    </section>
  );
}
