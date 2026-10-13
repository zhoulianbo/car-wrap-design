export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // JSON strings can contain HTML closing tags, including user content.
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
