type PageSpec = {
  path: string;
  locale?: 'en' | 'zh';
  keyword: string;
  title?: string;
  h1?: string;
  words: readonly [number, number];
  density: readonly [number, number];
};

export {};

const baseUrl = (
  process.argv.find((argument) => /^https?:\/\//.test(argument)) ||
  'http://localhost:3100'
).replace(/\/$/, '');
const pages: PageSpec[] = [
  {
    path: '/',
    keyword: 'Car Wrap Design',
    title: 'Car Wrap Design Online | Design Your Own Car Wrap Free',
    h1: 'Design Your Own Car Wrap Online',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/zh',
    locale: 'zh',
    keyword: '汽车车衣设计',
    title: '在线汽车车衣设计 | 免费设计你的专属车衣',
    h1: '在线设计你的专属汽车车衣',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/ai-car-wrap-generator',
    keyword: 'ai car wrap generator',
    title: 'AI Car Wrap Generator Online | Create & Preview Wraps',
    h1: 'AI Car Wrap Generator',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/zh/ai-car-wrap-generator',
    locale: 'zh',
    keyword: 'AI 车衣生成器',
    title: 'AI 车衣生成器 | 在线生成图案并预览车身效果',
    h1: 'AI 车衣生成器',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/tesla-wrap',
    keyword: 'tesla wrap',
    title: 'Tesla Wrap Design Online | Explore Colors & Styles',
    h1: 'Design Your Tesla Wrap Online',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/zh/tesla-wrap',
    locale: 'zh',
    keyword: '特斯拉车衣',
    title: '特斯拉车衣设计 | 在线探索配色、图案与 3D 效果',
    h1: '在线设计你的专属特斯拉车衣',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/tesla-model-y-wrap',
    keyword: 'tesla model y wrap',
    title: 'Tesla Model Y Wrap Design | Try Colors & 3D Preview',
    h1: 'Design Your Tesla Model Y Wrap in 3D',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/zh/tesla-model-y-wrap',
    locale: 'zh',
    keyword: '特斯拉 Model Y 车衣',
    title: '特斯拉 Model Y 车衣设计 | 在线配色与 3D 预览',
    h1: '在线设计特斯拉 Model Y 车衣',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/tesla-model-3-wrap',
    keyword: 'tesla model 3 wrap',
    title: 'Tesla Model 3 Wrap Design | Create & Preview Online',
    h1: 'Create Your Tesla Model 3 Wrap Online',
    words: [801, Infinity],
    density: [1, 3],
  },
  {
    path: '/zh/tesla-model-3-wrap',
    locale: 'zh',
    keyword: '特斯拉 Model 3 车衣',
    title: '特斯拉 Model 3 车衣设计 | 在线创作与 3D 预览',
    h1: '在线创作特斯拉 Model 3 车衣',
    words: [801, Infinity],
    density: [1, 3],
  },
];

function decode(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function textFromHtml(html: string) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html;
  return decode(
    main
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function countWords(text: string, locale: 'en' | 'zh') {
  if (locale === 'en')
    return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
  return Array.from(
    new Intl.Segmenter(locale, { granularity: 'word' }).segment(text)
  ).filter((segment) => segment.isWordLike).length;
}

function countPhrase(text: string, phrase: string, locale: 'en' | 'zh') {
  const normalized = text.toLowerCase();
  const needle = phrase.toLowerCase();
  let count = 0;
  let offset = 0;
  while ((offset = normalized.indexOf(needle, offset)) !== -1) {
    const before = normalized[offset - 1] ?? '';
    const after = normalized[offset + needle.length] ?? '';
    if (
      locale === 'zh' ||
      (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after))
    )
      count += 1;
    offset += needle.length;
  }
  return count;
}

const failures: string[] = [];

const homepageOnly = process.argv.includes('--homepage');
const generatorOnly = process.argv.includes('--generator');
const teslaOnly = process.argv.includes('--tesla');
const selectedPages =
  homepageOnly || generatorOnly || teslaOnly
    ? pages.filter(
        (spec) =>
          (homepageOnly && (spec.path === '/' || spec.path === '/zh')) ||
          (generatorOnly && spec.path.endsWith('/ai-car-wrap-generator')) ||
          (teslaOnly && /^\/(?:zh\/)?tesla/.test(spec.path))
      )
    : pages;

for (const spec of selectedPages) {
  const locale = spec.locale ?? 'en';
  const response = await fetch(`${baseUrl}${spec.path}`, {
    headers: { 'accept-language': locale },
  });
  if (!response.ok) {
    failures.push(`${spec.path}: returned HTTP ${response.status}`);
    continue;
  }
  const html = await response.text();
  const text = textFromHtml(html);
  const wordCount = countWords(text, locale);
  const phraseCount = countPhrase(text, spec.keyword, locale);
  const keywordWords = countWords(spec.keyword, locale);
  const density = wordCount
    ? (phraseCount * keywordWords * 100) / wordCount
    : 0;
  const title = decode(html.match(/<title>([^<]*)<\/title>/i)?.[1] || '');
  const description = decode(
    html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i
    )?.[1] ||
      html.match(
        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i
      )?.[1] ||
      ''
  );
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const h1 = textFromHtml(html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || '');
  const canonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const hreflangEn = /<link[^>]+hreflang=["']en["']/i.test(html);
  const hreflangZh = /<link[^>]+hreflang=["']zh["']/i.test(html);
  const internalLinks = (
    html.match(/<a\b[^>]+href=["'](?:\/|https?:\/\/[^"']*localhost)[^"']*/gi) ||
    []
  ).length;
  const missingAlt = (html.match(/<img\b(?![^>]*\balt=)[^>]*>/gi) || []).length;

  const checks = [
    [title.length >= 20 && title.length <= 65, `title length ${title.length}`],
    [!spec.title || title === spec.title, `unexpected title: ${title}`],
    [!spec.h1 || h1 === spec.h1, `unexpected H1: ${h1}`],
    [
      description.length >= (locale === 'zh' ? 50 : 80) &&
        description.length <= 170,
      `description length ${description.length}`,
    ],
    [h1Count === 1, `${h1Count} H1 elements`],
    [canonical, 'canonical missing'],
    [hreflangEn && hreflangZh, 'EN/ZH hreflang missing'],
    [missingAlt === 0, `${missingAlt} images missing alt`],
    [internalLinks >= 3, `only ${internalLinks} internal links`],
    [
      wordCount >= spec.words[0] && wordCount <= spec.words[1],
      `word count ${wordCount}`,
    ],
    [
      density >= spec.density[0] && density <= spec.density[1],
      `keyword density ${density.toFixed(2)}%`,
    ],
  ] as const;
  const failed = checks.filter(([passed]) => !passed).map(([, label]) => label);
  console.log(
    `${spec.path}: ${failed.length ? 'FAIL' : 'PASS'} | words=${wordCount} | "${spec.keyword}"=${phraseCount} (${density.toFixed(2)}%) | h1=${h1Count}`
  );
  for (const label of failed) failures.push(`${spec.path}: ${label}`);
}

if (failures.length) {
  console.error(`\nSEO audit failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `\nSEO audit passed for all ${selectedPages.length} selected pages.`
  );
}
