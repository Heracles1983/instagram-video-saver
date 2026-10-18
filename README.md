# INS Pocket 2.0

Instagram 视频保存 PWA，新版源码独立保存在 `ins-pocket-v2` 分支，原 `main` 保留。

在线入口：https://ins-pocket.heracles1983.chatgpt.site

## 使用

在 Safari 打开在线入口 → 分享 → 添加到主屏幕。粘贴公开 Reel、视频帖或轮播链接，解析后点“准备视频”，再次点击打开系统文件分享菜单。在支持的 iPhone 上选择“存储视频”，也可存储到文件。

不收集 Instagram 账号或密码。最近 8 条成功解析链接仅存于浏览器，可清空。视频不写入 Service Worker 缓存；断网显示离线页，解析和下载仍需网络。

## 重要限制

GitHub 保存源码；实际解析与下载 API 运行在 Sites 的 Cloudflare Worker。GitHub Pages 不能运行后端，本仓库 `pages/` 是新版在线入口跳转页。新站默认为所有者私有访问，首次可能需要 ChatGPT 登录。

上游 Instagram 的匿名访问、接口结构或限流会影响解析；公开视频也不保证成功。不支持私密内容、登录墙或已删除的帖子。外部媒体 URL 会过期，应重新解析。服务健康检查成功仅说明本站 API 正常，不代表 Instagram 可用。

已通过 TypeScript、4 项解析/安全测试及生产构建。首次验证的 Instagram 样例在开发网络中未提供视频数据，实际下载与 iPhone 相册保存尚需用可访问的真实链接确认。

## 开发与验证

Node >=22.13，pnpm 11.25。

```bash
pnpm install --frozen-lockfile
pnpm dev
node --test tests/instagram.test.mjs
pnpm exec tsc --noEmit
pnpm build
```

`GET /api/health` 检查服务；`POST /api/resolve` 接收 `{ "url": "Instagram 链接" }`；`GET /api/media` 仅代理 Instagram/Meta CDN 的视频，支持 Range，不会再次解析帖子。

## 发布

Sites 源码与部署由 Sites 工作流管理；向 GitHub 推送不会自动更新 Sites。修改后需要另行发布 Sites。`pages/` 可用于 GitHub Pages 的入口；不应把全栈源码作为静态站上传后期待 API 运行。

仅保存本人创作或已获得授权的内容。本项目与 Instagram/Meta 无隶属关系。
