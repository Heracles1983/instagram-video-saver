import { isAllowedMediaUrl, downloadHeaders } from "@/lib/instagram";
export async function GET(request:Request) {
 const query=new URL(request.url).searchParams; let raw=query.get("url")??"";
 const name=(query.get("name")??"instagram.mp4").replace(/[^a-zA-Z0-9_.-]/g,"_").slice(0,100);
 try {for(let hop=0;hop<4;hop++) {
  if(!isAllowedMediaUrl(raw)||new URL(raw).username||new URL(raw).password||(new URL(raw).port&&new URL(raw).port!=="443")) return new Response("无效的媒体地址",{status:400});
  const upstream=await fetch(raw,{headers:{...downloadHeaders,...(request.headers.get("range")?{Range:request.headers.get("range")!}:{})},redirect:"manual",signal:AbortSignal.timeout(30000)});
  if(upstream.status>=300&&upstream.status<400) {const next=upstream.headers.get("location");if(!next) break;raw=new URL(next,raw).href;continue;}
  if(!upstream.ok||!upstream.body) return new Response("视频地址已过期，请重新解析。",{status:502});
  const type=upstream.headers.get("content-type")?.toLowerCase()??"";
  if(!type.startsWith("video/")&&!type.includes("application/octet-stream")) return new Response("上游未返回视频文件",{status:502});
  const headers=new Headers({"Content-Type":"video/mp4","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":`attachment; filename="${name}"`});
  for(const key of ["content-length","content-range","accept-ranges"]) {const v=upstream.headers.get(key);if(v)headers.set(key,v);}
  return new Response(upstream.body,{status:upstream.status,headers});
 }}catch{}
 return new Response("下载连接中断，请重新解析后重试。",{status:502});
}
