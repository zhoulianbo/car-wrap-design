// Keep the site-specific loader beside its initializer. React 19 otherwise
// hoists an async external script into <head>, leaving plausible.init() at the
// end of <body> and allowing the loader to win the race.
export function Plausible({
  domain,
  src = 'https://plausible.io/js/script.js',
}: {
  domain?: string;
  src?: string;
}) {
  if (!src) return null;
  return (
    <>
      <script
        id="plausible-loader"
        data-domain={domain || undefined}
        src={src}
        async
        onLoad={() => undefined}
      />
      <script
        id="plausible-init"
        dangerouslySetInnerHTML={{
          __html: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init();`,
        }}
      />
    </>
  );
}
