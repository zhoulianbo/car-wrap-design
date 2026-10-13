/** Cover metadata lives beside the texture output in the existing AI task result. */
export function readGenerationCover(result?: string | null): {
  coverKey?: string;
  coverUrl?: string;
} {
  try {
    const value = JSON.parse(result || '{}');
    return typeof value?.coverKey === 'string' &&
      typeof value?.coverUrl === 'string'
      ? { coverKey: value.coverKey, coverUrl: value.coverUrl }
      : {};
  } catch {
    return {};
  }
}
