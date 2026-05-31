# 家庭待办

一个可部署到 Vercel 的纯前端家庭待办事项 PWA。页面无鉴权，使用固定 `family_id` 和 Supabase 共享数据，适合两台 iPhone 添加到主屏幕后共同维护家庭事项。

## 本地运行

```bash
npm install
npm run dev
```

复制 `.env.example` 为 `.env.local`，填入 Supabase 项目配置：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FAMILY_ID=duirian-home
```

## Supabase 初始化

在 Supabase SQL Editor 执行 [supabase/schema.sql](./supabase/schema.sql)。MVP 默认开放匿名读写，并按固定 `family_id` 存储数据；不要用它保存敏感信息。

如果开启 Realtime，请在 Supabase Dashboard 的 Realtime 设置中为 `public.lists` 和 `public.todos` 打开复制。

## Vercel 部署

1. 导入这个仓库。
2. Framework Preset 选择 Vite。
3. 添加环境变量：`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`VITE_FAMILY_ID`。
4. Build Command 使用 `npm run build`，Output Directory 使用 `dist`。

部署完成后，用 iPhone Safari 打开网址，选择“分享”里的“添加到主屏幕”。
