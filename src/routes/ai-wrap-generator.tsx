import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/ai-wrap-generator')({
  beforeLoad: () => {
    throw redirect({
      to: '/ai-car-wrap-generator',
      statusCode: 301,
    });
  },
});
