import { createFileRoute, redirect } from '@tanstack/react-router';

// Preserve old bookmarks; all current navigation uses /wraps.
export const Route = createFileRoute('/projects/')({
  beforeLoad: () => {
    throw redirect({ to: '/wraps', replace: true });
  },
});
