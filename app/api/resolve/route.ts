import { resolveInstagramInput, InstagramResolveError } from "@/lib/instagram";
export async function POST(request: Request) {
 try {
  if(Number(request.headers.get("content-length")??0)>4096) return Response.json({error:"链接太长"},{status:413});
  const text=await request.text(); if(text.length>4096) return Response.json({error:"链接太长"},{status:413});
  const body=JSON.parse(text);
  return Response.json(await resolveInstagramInput(typeof body.url==="string"?body.url:""),{headers:{"Cache-Control":"no-store"}});
 } catch(e) {return Response.json({error:e instanceof InstagramResolveError?e.message:"解析服务暂时不可用，请稍后重试。"},{status:e instanceof InstagramResolveError?e.status:502,headers:{"Cache-Control":"no-store"}});}
}
