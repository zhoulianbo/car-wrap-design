import { useEffect, useState } from 'react';

export function useGalleryPreference(
  userId: string | undefined,
  isPaid: boolean
) {
  const [enabled, setEnabled] = useState(true);
  const key = userId
    ? `wrap-open-to-gallery:${encodeURIComponent(userId)}`
    : null;
  useEffect(() => {
    const restore = () => {
      try {
        setEnabled(!isPaid || !key || localStorage.getItem(key) !== 'false');
      } catch {
        setEnabled(true);
      }
    };
    restore();
    const sync = (event: StorageEvent) => {
      if (event.key === key || event.key === null) restore();
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key, isPaid]);
  return [
    isPaid ? enabled : true,
    (value: boolean) => {
      if (!isPaid || !key) return;
      setEnabled(value);
      try {
        localStorage.setItem(key, String(value));
      } catch {
        /* Keep the current choice for this session. */
      }
    },
  ] as const;
}
