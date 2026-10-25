import { useEffect, useRef, useState, type CSSProperties } from 'react';

import type { FooterLinkItem } from '@/lib/footer-links';

import styles from './footer-link-row.module.css';

export function FooterLinkRow({
  links,
  label,
}: {
  links: FooterLinkItem[];
  label: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const source = useRef<HTMLUListElement>(null);
  const [motion, setMotion] = useState({ overflowing: false, duration: 24 });

  useEffect(() => {
    const container = viewport.current;
    const row = source.current;
    if (!container || !row) return;
    const measure = () => {
      const overflowing = row.scrollWidth > container.clientWidth + 1;
      const duration = Math.max(24, Math.round(row.scrollWidth / 35));
      setMotion((previous) =>
        previous.overflowing === overflowing && previous.duration === duration
          ? previous
          : { overflowing, duration }
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(row);
    measure();
    return () => observer.disconnect();
  }, [links]);

  if (!links.length) return null;

  function items(clone = false) {
    return links.map((link) => (
      <li key={link.id} className="shrink-0">
        <a
          href={link.url}
          target="_blank"
          rel={link.rel}
          tabIndex={clone ? -1 : undefined}
          data-footer-link-id={clone ? undefined : link.id}
          className="text-muted-foreground hover:text-primary inline-flex items-center text-sm whitespace-nowrap transition-colors"
        >
          {link.group === 'badge' && link.imageUrl ? (
            <img
              src={link.imageUrl}
              alt={link.altText || link.title}
              title={link.title}
              loading="lazy"
              className="h-8 w-auto max-w-none object-contain"
            />
          ) : (
            link.title
          )}
        </a>
      </li>
    ));
  }

  return (
    <div
      ref={viewport}
      className={styles.viewport}
      data-overflowing={motion.overflowing}
      data-footer-link-row={links[0].group}
      style={
        { '--footer-link-duration': `${motion.duration}s` } as CSSProperties
      }
    >
      <ul ref={source} className={styles.track} aria-label={label}>
        {items()}
      </ul>
      {motion.overflowing && (
        <ul
          className={`${styles.track} ${styles.clone}`}
          aria-hidden="true"
          inert
        >
          {items(true)}
        </ul>
      )}
    </div>
  );
}
