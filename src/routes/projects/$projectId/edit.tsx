import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/$projectId/edit')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/wraps/$wrapId/edit',
      params: { wrapId: params.projectId },
      replace: true,
    });
  },
});
