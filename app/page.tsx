"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Camera, Check, Clipboard, Download, Link2, LoaderCircle,
  LockKeyhole, RotateCcw, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type Video = {
  index: number;
  videoUrl: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  filename: string;
  downloadPath: string;
};
type Result = {
  shortcode: string;
  author: string | null;
  caption: string | null;
  videos: Video[];
};

type IOSNavigator = Navigator & { standalone?: boolean };

function isStandaloneWebApp() {
  return window.matchMedia("(display-mode: standalone)").matches
    || (navigator as IOSNavigator).standalone === true;
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIOS] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const video = useMemo(
    () => result?.videos.find((item) => item.index === selected) ?? result?.videos[0] ?? null,
    [result, selected],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const updateDeviceMode = () => {
      setStandalone(isStandaloneWebApp());
      setIOS(isIOSDevice());
    };
    updateDeviceMode();
    mediaQuery.addEventListener?.("change", updateDeviceMode);
    return () => mediaQuery.removeEventListener?.("change", updateDeviceMode);
  }, []);

  function clear() {
    setUrl("");
    setResult(null);
    setSelected(0);
    setMessage(null);
  }

  async function paste() {
    setMessage(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return setMessage("剪贴板里没有链接");
      setUrl(text.trim());
      setResult(null);
    } catch {
      setMessage("请长按输入框，手动选择“粘贴”");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accepted) return setMessage("请先确认你有权保存这个视频");
    setLoading(true);
    setMessage(null);
    setResult(null);
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json() as Result & { error?: string };
      if (!response.ok) throw new Error(data.error || "暂时无法解析这个链接");
      setResult(data);
      setSelected(data.videos[0]?.index ?? 0);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "暂时无法解析这个链接");
    } finally {
      setLoading(false);
    }
  }

  async function saveVideoOnIOS() {
    if (!video || downloadLoading) return;
    setDownloadLoading(true);
    setMessage(null);
    try {
      const response = await fetch(video.downloadPath);
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "视频准备失败，请重新解析后再试");
      }

      const sourceBlob = await response.blob();
      const mp4Blob = sourceBlob.type === "video/mp4"
        ? sourceBlob
        : new Blob([sourceBlob], { type: "video/mp4" });
      const file = new File([mp4Blob], video.filename, {
        type: "video/mp4",
        lastModified: Date.now(),
      });
      const shareData: ShareData = { files: [file] };

      if (navigator.share && navigator.canShare?.(shareData)) {
        try {
          await navigator.share(shareData);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          throw error;
        }
        return;
      }

      const blobUrl = URL.createObjectURL(mp4Blob);
      const viewer = window.open(blobUrl, "_blank");
      if (!viewer) window.location.assign(blobUrl);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "视频准备失败，请重新解析后再试");
    } finally {
      setDownloadLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-7">
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between px-1 pb-8 sm:pb-11">
          <div className="flex items-center gap-3">
            <div className="brand grid size-11 place-items-center rounded-2xl text-white">
              <Camera className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[.18em] text-white/40">HERACLES LAB</p>
              <p className="text-base font-semibold text-white">INS 视频保存器</p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50">
            <span className="size-1.5 rounded-full bg-emerald-400" />仅公开内容
          </span>
        </header>

        <section className="grid items-start gap-5 lg:grid-cols-[1.18fr_.82fr] lg:gap-6">
          <div className="tool-card relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#101116]/90 p-5 backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="gradient absolute inset-x-0 top-0 h-1" />
            <div className="mb-8 max-w-xl">
              <p className="mb-4 flex items-center gap-2 text-sm font-medium text-fuchsia-300">
                <Sparkles className="size-4" />无需登录 Instagram
              </p>
              <h1 className="text-balance text-[2.35rem] font-semibold leading-[1.05] tracking-[-.045em] text-white sm:text-5xl">
                复制链接，<span className="gradient-text">保存视频。</span>
              </h1>
              <p className="mt-4 text-base leading-7 text-white/55">
                支持公开 Reels、视频帖子，以及轮播帖子中的视频。
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="ig-url" className="mb-2 block text-sm font-medium text-white/75">Instagram 链接</label>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-2 focus-within:border-fuchsia-400/60 focus-within:ring-4 focus-within:ring-fuchsia-500/10">
                  <Link2 className="ml-2 size-5 shrink-0 text-white/30" />
                  <Input
                    id="ig-url"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setResult(null);
                      setMessage(null);
                    }}
                    placeholder="https://www.instagram.com/reel/..."
                    className="h-12 flex-1 border-0 bg-transparent px-1 text-base text-white shadow-none placeholder:text-white/25 focus-visible:ring-0 dark:bg-transparent md:text-base"
                  />
                  {url ? (
                    <Button type="button" variant="ghost" size="icon-lg" onClick={clear} aria-label="清空链接"
                      className="rounded-xl text-white/45 hover:bg-white/10 hover:text-white">
                      <X />
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" size="lg" onClick={paste}
                      className="h-11 rounded-xl bg-white/10 px-3 text-white hover:bg-white/15">
                      <Clipboard />粘贴
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-white/35">从 Instagram 点“分享”→“复制链接”，再粘贴到这里。</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-4 text-sm leading-6 text-white/55">
                <Checkbox
                  checked={accepted}
                  onCheckedChange={(value) => { setAccepted(value === true); setMessage(null); }}
                  className="mt-1 border-white/25 data-[state=checked]:border-fuchsia-500 data-[state=checked]:bg-fuchsia-500"
                  aria-label="确认有权保存视频"
                />
                <span>我确认这是本人创作、已获授权，或允许保存的公开内容。</span>
              </label>

              <Button type="submit" size="lg" disabled={!url.trim() || !accepted || loading}
                className="gradient h-14 w-full rounded-2xl text-base font-semibold text-white shadow-lg shadow-fuchsia-950/40 hover:brightness-110 disabled:opacity-35">
                {loading ? <><LoaderCircle className="animate-spin" />正在解析公开视频…</> : <><Download />解析视频</>}
              </Button>
            </form>

            <div aria-live="polite">
              {message && (
                <div className="mt-5 flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-rose-400" />{message}
                </div>
              )}
              {result && video && (
                <section className="result mt-7 rounded-[1.6rem] border border-white/10 bg-black/25 p-3 sm:p-4">
                  <video key={video.videoUrl} src={video.videoUrl} poster={video.thumbnailUrl ?? undefined}
                    controls playsInline preload="metadata"
                    className="aspect-[9/12] max-h-[34rem] w-full rounded-[1.15rem] bg-black object-contain" />
                  {result.videos.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
                      {result.videos.map((item, i) => (
                        <Button key={item.index} type="button" variant="ghost" onClick={() => setSelected(item.index)}
                          className={`h-10 shrink-0 rounded-xl px-4 ${video.index === item.index ? "bg-white text-black hover:bg-white/90" : "bg-white/5 text-white/60 hover:bg-white/10"}`}>
                          视频 {i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                  <div className="px-1 pt-4 sm:px-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-white/45">
                      {result.author && <span>@{result.author}</span>}
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs">MP4</span>
                      {video.width && video.height && <span className="text-xs">{video.width} × {video.height}</span>}
                    </div>
                    {result.caption && <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/55">{result.caption}</p>}
                    {standalone || ios ? (
                      <>
                        <Button type="button" size="lg" disabled={downloadLoading} onClick={saveVideoOnIOS}
                          className="mt-4 h-13 w-full rounded-2xl bg-white text-base font-semibold text-black hover:bg-white/90 disabled:opacity-60">
                          {downloadLoading ? <><LoaderCircle className="animate-spin" />正在准备视频…</> : <><Download />保存到相册</>}
                        </Button>
                        <p className="mt-2 text-center text-xs leading-5 text-white/35">iPhone / iPad 会打开系统菜单，选择“存储视频”即可直接进入照片。</p>
                      </>
                    ) : (
                      <Button asChild size="lg" className="mt-4 h-13 w-full rounded-2xl bg-white text-base font-semibold text-black hover:bg-white/90">
                        <a href={video.downloadPath} download={video.filename}><Download />下载到手机</a>
                      </Button>
                    )}
                    <Button type="button" variant="ghost" onClick={clear}
                      className="mt-2 h-11 w-full rounded-xl text-white/45 hover:bg-white/5 hover:text-white">
                      <RotateCcw />换一个链接
                    </Button>
                  </div>
                </section>
              )}
            </div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[.045] p-6 sm:p-7">
              <p className="mb-5 text-xs font-semibold tracking-[.18em] text-white/35">怎么使用</p>
              <ol className="space-y-5">
                {[
                  ["01", "复制链接", "在 Instagram 视频的分享菜单中复制链接。"],
                  ["02", "粘贴并解析", "粘贴到左侧，通常几秒内就能识别。"],
                  ["03", "保存视频", "iPhone / iPad 点“保存到相册”，再在系统菜单选择“存储视频”；其他浏览器保持直接下载。"],
                ].map(([n, title, copy]) => (
                  <li key={n} className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-white/45">{n}</span>
                    <div><p className="font-medium text-white/85">{title}</p><p className="mt-1 text-sm leading-6 text-white/40">{copy}</p></div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-[2rem] border border-emerald-400/15 bg-emerald-400/[.045] p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck className="size-5" /></span>
                <div><p className="font-medium text-white/85">不保存你的内容</p><p className="text-sm text-white/40">即时解析，即时下载</p></div>
              </div>
              <div className="my-5 h-px bg-white/10" />
              <ul className="space-y-3 text-sm leading-6 text-white/45">
                <li className="flex gap-2.5"><Check className="mt-1 size-4 shrink-0 text-emerald-400" />不要求账号密码</li>
                <li className="flex gap-2.5"><Check className="mt-1 size-4 shrink-0 text-emerald-400" />不建立下载记录或视频库</li>
                <li className="flex gap-2.5"><LockKeyhole className="mt-1 size-4 shrink-0" />不支持私密账号、限时动态和直播</li>
              </ul>
            </div>
          </aside>
        </section>
        <footer className="flex flex-col gap-2 px-1 pb-4 pt-8 text-xs leading-5 text-white/25 sm:flex-row sm:justify-between">
          <p>仅用于保存你有权下载的公开内容。</p>
          <p>Instagram 是 Meta Platforms, Inc. 的商标；本站与其无隶属关系。</p>
        </footer>
      </div>
    </main>
  );
}