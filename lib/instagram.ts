const IG_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com", "instagr.am", "www.instagr.am"]);
const MEDIA_PATHS = new Set(["p", "reel", "reels", "tv"]);
const CODE = /^[A-Za-z0-9_-]{3,32}$/;
const timeout = 15_000;

const browserHeaders = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
};
const mobileHeaders = {
  Accept: "*/*",
  "Accept-Language": "en-US",
  "User-Agent": "Instagram 320.0.0.42.101 Android (34/14; 420dpi; 1080x2400; Google; Pixel 8; shiba; en_US)",
  "X-IG-App-ID": "567067343352427",
  "X-IG-App-Locale": "en_US",
  "X-IG-Device-Locale": "en_US",
};

export type InstagramVideo = {
  index: number;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  filename: string;
};
export type InstagramResult = {
  shortcode: string;
  canonicalUrl: string;
  author: string | null;
  caption: string | null;
  videos: InstagramVideo[];
};

export class InstagramResolveError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = "InstagramResolveError";
  }
}

async function timedFetch(input: string | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(input, { ...init, cache: "no-store", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function firstUrl(input: string) {
  const value = input.trim();
  const full = value.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (full) return full.replace(/[)\],.!，。；;]+$/, "");
  const short = value.match(/(?:www\.)?(?:instagram\.com|instagr\.am)\/[^\s<>"']+/i)?.[0];
  return short ? `https://${short.replace(/[)\],.!，。；;]+$/, "")}` : value;
}

function assertIgUrl(raw: string) {
  let url: URL;
  try { url = new URL(firstUrl(raw)); }
  catch { throw new InstagramResolveError("invalid_url", "这不是有效的 Instagram 链接"); }
  if (url.protocol !== "https:" || !IG_HOSTS.has(url.hostname.toLowerCase())) {
    throw new InstagramResolveError("invalid_host", "请粘贴 Instagram 的公开视频链接");
  }
  if (url.username || url.password || (url.port && url.port !== "443")) {
    throw new InstagramResolveError("invalid_url", "这个链接格式不受支持");
  }
  url.hash = "";
  return url;
}

function codeFromUrl(url: URL) {
  const parts = url.pathname.split("/").filter(Boolean);
  const code = parts[1] ?? "";
  return MEDIA_PATHS.has((parts[0] ?? "").toLowerCase()) && CODE.test(code) ? code : null;
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

function meta(html: string, key: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1];
    if (name?.toLowerCase() !== key.toLowerCase()) continue;
    const value = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (value) return decodeHtml(value);
  }
  return null;
}

function canonical(html: string) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/rel=["'][^"']*canonical[^"']*["']/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (href) return decodeHtml(href);
  }
  return meta(html, "og:url");
}

async function expandShare(input: URL) {
  let current = input;
  for (let i = 0; i < 4; i += 1) {
    const response = await timedFetch(current, {
      headers: { "User-Agent": "curl/8.7.1", Accept: "text/html,*/*" },
      redirect: "manual",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) break;
      current = assertIgUrl(new URL(location, current).toString());
      continue;
    }
    const pageUrl = canonical(await response.text());
    if (pageUrl) {
      const next = assertIgUrl(pageUrl);
      if (next.toString() !== current.toString()) { current = next; continue; }
    }
    break;
  }
  return current;
}

export async function parseInstagramInput(input: string) {
  if (!input || input.length > 2500) throw new InstagramResolveError("invalid_url", "请粘贴一个有效的 Instagram 链接");
  let url = assertIgUrl(input);
  let shortcode = codeFromUrl(url);
  if (!shortcode && url.pathname.split("/").filter(Boolean)[0] === "share") {
    try { url = await expandShare(url); shortcode = codeFromUrl(url); }
    catch { throw new InstagramResolveError("share_failed", "分享链接暂时无法展开，请在 Instagram 里重新复制"); }
  }
  if (!shortcode) throw new InstagramResolveError("unsupported", "当前支持公开 Reel、视频帖子和视频轮播链接");
  return { shortcode, canonicalUrl: `https://www.instagram.com/p/${shortcode}/` };
}

function shortcodeId(shortcode: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let value = 0n;
  for (const char of shortcode) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) return null;
    value = value * 64n + BigInt(digit);
  }
  return value.toString();
}

async function mediaId(shortcode: string) {
  const endpoint = new URL("https://i.instagram.com/api/v1/oembed/");
  endpoint.searchParams.set("url", `https://www.instagram.com/p/${shortcode}/`);
  try {
    const response = await timedFetch(endpoint, { headers: mobileHeaders });
    const body = await response.text();
    const match = body.match(/"media_id"\s*:\s*"?(\d+(?:_\d+)?)"?/);
    if (response.ok && match?.[1]) return match[1];
  } catch {}
  return shortcodeId(shortcode);
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function str(value: unknown) { return typeof value === "string" && value ? value : null; }
function num(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }

function allowedMedia(raw: string | null) {
  if (!raw) return false;
  try {
    const host = new URL(raw);
    return host.protocol === "https:" && (
      host.hostname === "cdninstagram.com" || host.hostname.endsWith(".cdninstagram.com") ||
      host.hostname === "fbcdn.net" || host.hostname.endsWith(".fbcdn.net")
    );
  } catch { return false; }
}

function bestVersion(value: unknown) {
  if (!Array.isArray(value)) return null;
  const list = value.filter(record).filter((item) => allowedMedia(str(item.url)));
  return list.reduce<Record<string, unknown> | null>((best, item) => {
    if (!best) return item;
    const a = (num(best.width) ?? 0) * (num(best.height) ?? 0);
    const b = (num(item.width) ?? 0) * (num(item.height) ?? 0);
    return b > a ? item : best;
  }, null);
}

function thumb(node: Record<string, unknown>) {
  const versions = record(node.image_versions2) ? node.image_versions2 : null;
  const candidates = versions && Array.isArray(versions.candidates) ? versions.candidates.filter(record) : [];
  const url = (candidates[0] && str(candidates[0].url)) ?? str(node.display_url) ?? str(node.thumbnail_src);
  return allowedMedia(url) ? url : null;
}

function nodes(container: Record<string, unknown>) {
  if (Array.isArray(container.carousel_media)) return container.carousel_media.filter(record);
  const sidecar = record(container.edge_sidecar_to_children) ? container.edge_sidecar_to_children : null;
  if (sidecar && Array.isArray(sidecar.edges)) {
    return sidecar.edges.filter(record).map((edge) => edge.node).filter(record);
  }
  return [container];
}

function videos(container: Record<string, unknown>, shortcode: string) {
  const list = nodes(container);
  const output: InstagramVideo[] = [];
  list.forEach((node, index) => {
    const version = bestVersion(node.video_versions);
    const url = version ? str(version.url) : str(node.video_url);
    if (!allowedMedia(url)) return;
    const dimensions = record(node.dimensions) ? node.dimensions : null;
    output.push({
      index,
      url: url as string,
      thumbnailUrl: thumb(node),
      width: version ? num(version.width) : num(dimensions?.width),
      height: version ? num(version.height) : num(dimensions?.height),
      filename: `instagram_${shortcode}${list.length > 1 ? `_${index + 1}` : ""}.mp4`,
    });
  });
  return output;
}

function details(item: Record<string, unknown>) {
  const user = record(item.user) ? item.user : record(item.owner) ? item.owner : null;
  const caption = record(item.caption) ? str(item.caption.text) : null;
  return { author: user ? str(user.username) : null, caption };
}

function findContainer(root: unknown, shortcode: string) {
  const queue: unknown[] = [root];
  let seen = 0;
  while (queue.length && seen < 12000) {
    const current = queue.shift();
    seen += 1;
    if (Array.isArray(current)) { queue.push(...current.slice(0, 500)); continue; }
    if (!record(current)) continue;
    const found = videos(current, shortcode);
    if (found.length) return { videos: found, ...details(current) };
    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") queue.push(value);
    });
  }
  return null;
}

async function mobileMedia(shortcode: string) {
  const id = await mediaId(shortcode);
  if (!id) return null;
  try {
    const response = await timedFetch(`https://i.instagram.com/api/v1/media/${encodeURIComponent(id)}/info/`, { headers: mobileHeaders });
    if (!response.ok) return null;
    const data = await response.json() as unknown;
    if (!record(data) || !Array.isArray(data.items)) return null;
    const item = data.items.find(record);
    if (!item) return null;
    const found = videos(item, shortcode);
    return found.length ? { videos: found, ...details(item) } : null;
  } catch { return null; }
}

function contextJson(html: string) {
  try {
    const raw = html.match(/"init",\[\],\[(.*?)\]\],/s)?.[1];
    if (!raw) return null;
    const initial = JSON.parse(raw) as unknown;
    if (!record(initial)) return null;
    const context = str(initial.contextJSON);
    return context ? JSON.parse(context) as unknown : initial;
  } catch { return null; }
}

async function embedMedia(shortcode: string) {
  for (const url of [
    `https://www.instagram.com/p/${shortcode}/embed/captioned/`,
    `https://www.instagram.com/p/${shortcode}/`,
  ]) {
    try {
      const response = await timedFetch(url, { headers: browserHeaders, redirect: "follow" });
      if (!response.ok) continue;
      const html = await response.text();
      const context = contextJson(html);
      const found = context && findContainer(context, shortcode);
      if (found) return found;
      const urlValue = meta(html, "og:video:secure_url") ?? meta(html, "og:video");
      if (allowedMedia(urlValue)) {
        const image = meta(html, "og:image");
        return {
          videos: [{ index: 0, url: urlValue as string, thumbnailUrl: allowedMedia(image) ? image : null, width: null, height: null, filename: `instagram_${shortcode}.mp4` }],
          author: null,
          caption: meta(html, "og:description"),
        };
      }
    } catch {}
  }
  return null;
}

export async function resolveInstagramShortcode(shortcode: string): Promise<InstagramResult> {
  if (!CODE.test(shortcode)) throw new InstagramResolveError("invalid_shortcode", "这个 Instagram 链接格式不正确");
  const resolved = await mobileMedia(shortcode) ?? await embedMedia(shortcode);
  if (!resolved?.videos.length) {
    throw new InstagramResolveError("unavailable", "没有找到可下载的视频。它可能是私密、已删除、仅限登录查看，或 Instagram 暂时限制了解析。", 422);
  }
  return {
    shortcode,
    canonicalUrl: `https://www.instagram.com/p/${shortcode}/`,
    author: resolved.author,
    caption: resolved.caption,
    videos: resolved.videos,
  };
}

export async function resolveInstagramInput(input: string) {
  const { shortcode } = await parseInstagramInput(input);
  return resolveInstagramShortcode(shortcode);
}
export function isAllowedMediaUrl(url: string) { return allowedMedia(url); }
export const downloadHeaders = {
  Accept: "video/mp4,video/*;q=0.9,*/*;q=0.5",
  Referer: "https://www.instagram.com/",
  "User-Agent": browserHeaders["User-Agent"],
};
