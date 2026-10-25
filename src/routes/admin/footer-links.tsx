import { createFileRoute } from '@tanstack/react-router';

import { AdminFooterLinks } from '@/blocks/admin-footer-links';

export const Route = createFileRoute('/admin/footer-links')({
  component: AdminFooterLinks,
});
