import { downloadHeaders, InstagramResolveError, isAllowedMediaUrl, resolveInstagramShortcode } from "@/lib/instagram";

async function mediaResponse(rawUrl: string, range: string | null) {
  let url = rawUrl;
  for (let i = 0; i < 3; i += 1) {
    if (!isAllowedMediaUrl(url)) return null;
    const response = await fetch(url, {
      headers: { ...downloadHeaders, ...(range ? { Range: range } : {}) },
      redirect: "manual",
      cache: "no-store",
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      url = new URL(location, url).toString();
      continue;
    }
    return response;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") ?? "";
    const index = Number.parseInt(url.searchParams.get("index") ?? "0", 10);
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(code) || !Number.isInteger(index) || index < 0 || index > 20) {
      throw new InstagramResolveError("invalid_download", "下载链接无效");
    }
    const result = await resolveInstagramShortcode(code);
    const video = result.videos.find((item) => item.index === index);
    if (!video) throw new InstagramResolveError("not_found", "没有找到这个视频", 404);
    const upstream = await mediaResponse(video.url, request.headers.get("range"));
    if (!upstream?.ok || !upstream.body) throw new InstagramResolveError("download_failed", "下载地址已失效，请返回重新解析", 502);
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${video.filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
      "X-Content-Type-Options": "nosniff",
    });
    for (const name of ["content-length", "content-range", "accept-ranges"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    const known = error instanceof InstagramResolveError;
    return new Response(error instanceof Error ? error.message : "下载暂时失败", {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
