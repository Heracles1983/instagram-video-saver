import { InstagramResolveError, resolveInstagramInput } from "@/lib/instagram";

const headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 8192) {
      return Response.json({ error: "链接内容过长" }, { status: 413, headers });
    }
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string") throw new InstagramResolveError("invalid_url", "请先粘贴 Instagram 视频链接");
    const result = await resolveInstagramInput(body.url);
    return Response.json({
      ...result,
      videos: result.videos.map((video) => ({
        index: video.index,
        videoUrl: video.url,
        thumbnailUrl: video.thumbnailUrl,
        width: video.width,
        height: video.height,
        filename: video.filename,
        downloadPath: `/api/download?code=${encodeURIComponent(result.shortcode)}&index=${video.index}`,
      })),
    }, { headers });
  } catch (error) {
    const known = error instanceof InstagramResolveError;
    return Response.json({
      error: known ? error.message : "解析暂时失败，请稍后再试",
      code: known ? error.code : "resolve_failed",
    }, { status: known ? error.status : 500, headers });
  }
}
