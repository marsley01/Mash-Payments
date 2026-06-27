import { unstable_cache } from "next/cache"

export function cachedQuery<T>(
  fn: () => Promise<T>,
  tags: string[],
  revalidateSeconds = 30,
): Promise<T> {
  return unstable_cache(fn, tags, { revalidate: revalidateSeconds, tags })()
}

export function revalidateTags(tags: string[]): void {
  const { revalidateTag } = require("next/cache")
  tags.forEach((tag) => revalidateTag(tag))
}
