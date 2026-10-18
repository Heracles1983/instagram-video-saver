import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata:Metadata={title:"INS Pocket · 视频保存",description:"粘贴 Instagram 链接，预览并保存视频。",manifest:"/manifest.webmanifest",appleWebApp:{capable:true,title:"INS Pocket",statusBarStyle:"default"},icons:{icon:"/favicon.svg",apple:"/icon-192.png"}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#f7f7f2"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
