# INS 视频保存器

一个面向公开 Instagram 内容的开源视频保存工具。粘贴 Reel、视频帖子或轮播帖子链接，即可预览并下载其中的 MP4 视频。

## 功能

- 支持公开 Reels、视频帖子及轮播中的多个视频
- 自动展开 Instagram 分享链接
- 视频预览、分辨率提示与 MP4 下载
- 不要求 Instagram 账号或密码
- 不建立下载记录或视频库
- 对输入地址与上游媒体地址做域名校验

## 使用限制

- 仅支持公开内容，不支持私密账号、限时动态和直播
- Instagram 的接口或页面结构变更后，解析逻辑可能需要更新
- 请只下载本人创作、已获授权或允许保存的内容，并遵守适用法律与平台条款
- 本项目与 Instagram 或 Meta Platforms, Inc. 无隶属或合作关系

## 技术栈

- React 19 + TypeScript
- [vinext](https://github.com/cloudflare/vinext)
- Cloudflare Workers / Vite
- Tailwind CSS + shadcn/ui

## 本地运行

需要 Node.js `>=22.13.0`，以及提供 `bash`、GNU `timeout` 和 `flock` 的 Linux 环境。

```bash
npm ci
npm run dev
```

默认开发服务由 Vite/Vinext 启动。生产构建：

```bash
npm run build
npm run start
```

运行测试：

```bash
npm test
```

## 部署说明

该项目包含 `/api/resolve` 与 `/api/download` 两个服务端路由，需要部署到支持 Cloudflare Workers/Vinext 的全栈运行环境。GitHub Pages 只能托管静态文件，无法单独运行本项目的解析和下载后端。

部署环境还必须允许服务端访问 Instagram 的公开页面与媒体 CDN。某些托管服务的网络策略、地区限制或反自动化措施可能导致解析失败。

## 项目结构

```text
app/
  api/resolve/       解析公开 Instagram 链接
  api/download/      校验并代理视频下载
  page.tsx           前端界面
lib/instagram.ts     URL 校验与媒体解析逻辑
worker/              Cloudflare Worker 入口
```

## 开源许可

[MIT License](LICENSE) © 2026 Heracles1983
