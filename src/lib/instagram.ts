// Unofficial links: disable this single flag if Instagram changes tag routing.
export const INTEREST_LANDING_ENABLED = true;
const INSTAGRAM_HOME = 'https://www.instagram.com/';
const TAG_BASE = `${INSTAGRAM_HOME}explore/tags/`;
export function interestUrl(name: string) {
  return `${TAG_BASE}${encodeURIComponent(
    name.trim().toLowerCase().replace(/\s+/g, ''),
  )}/`;
}
export function supportsInterestLink(name: string) {
  // Instagram hashtag characters: letters, marks, numbers and underscore.
  return /^[\p{L}\p{M}\p{N}_]+$/u.test(name.trim().replace(/\s+/g, ''));
}
export type InstagramTransport = {
  openTag: (url: string) => Promise<boolean>;
  openApp: () => Promise<boolean>;
  openBrowser: (url: string) => Promise<boolean>;
};
export async function launchInstagram(
  name: string,
  transport: InstagramTransport,
  useTag = INTEREST_LANDING_ENABLED,
): Promise<'tag' | 'app' | 'browser'> {
  if (useTag && supportsInterestLink(name)) {
    try {
      if (await transport.openTag(interestUrl(name))) {
        return 'tag';
      }
    } catch {
      /* Try the app home. */
    }
  }
  try {
    if (await transport.openApp()) {
      return 'app';
    }
  } catch {
    /* Try the browser. */
  }
  if (await transport.openBrowser(INSTAGRAM_HOME)) {
    return 'browser';
  }
  throw new Error('Instagram could not be opened.');
}
