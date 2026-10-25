# 页脚友链

## 后台使用

- 入口：`/admin/footer-links`（后台「内容 → 页脚友链」）。
- 新增和编辑使用弹框，支持文字链接、图片徽章，以及目录站提供的 HTML 链接导入。导入仅提取首个链接及图片字段，不保存或执行原始 HTML。
- 无语言、状态字段：保存即发布，删除即下架。仅英文页面展示。
- 文字友链和图片徽章各占一行；每行仅在超出可用宽度时从右向左循环滚动，悬停或键盘聚焦时暂停。系统开启减少动态效果时改为手动横向滚动。
- 保存、删除后自动刷新列表，并将数据库中的完整列表同步至 KV。同步失败会保留数据库结果并显示提示；使用「同步到 KV」重试，无需重复新增。
- API 读取需要 `admin.settings.read`，写入、删除和同步需要 `admin.settings.write`。

## 数据和渲染

`footer_link` 包含 `id`、`group`（friend/badge）、`title`、`url`、`image_url`、`alt_text`、`rel`、`sort`、`created_at`、`updated_at`。展示按分组、排序值、标题及 ID 排序。

使用现有 `CONFIG_KV` 绑定，共享 `src/config/kv.ts` 中的配置前缀：

- 原配置键保持 `car-warp-design:settings:v1`。
- 友链快照键为 `car-warp-design:footer-links:v1`。
- 前缀中的历史拼写 `warp` 保持不变，避免更换已有配置键。

英文页面的根 loader 在服务端读取 KV，页脚输出真实的 `<a href>` 和图片元素，目录站无需执行 JavaScript 即可检查链接。生产 KV 缺失或损坏时隐藏友链，不回源查询 D1；其他页面继续正常加载。本地无 KV 的 SQLite 开发环境从本地数据库读取。

KV 使用 60 秒读取缓存，并具有最终一致性；发布后其他区域可能延迟看到变化。持续快速写入同一键也可能触发 KV 限流，可稍后点击同步重试。

当前项目没有 R2 HTML/页面缓存，因此本功能不执行 R2 清理。若以后引入整页缓存，应在发布快照后增加对应页面失效处理。

## 数据库迁移与上线

迁移文件：`drizzle/0001_abnormal_luckman.sql`，仅新增 `footer_link` 及排序索引。SQLite、PostgreSQL、MySQL 模板均已更新。

本地开发数据库已同步。生产迁移和部署未执行；先审核迁移，再通过现有 D1 流程应用：

```bash
pnpm exec wrangler d1 migrations apply car-wrap-design-db --remote --config wrangler.jsonc
```

完成迁移并部署后，在后台添加友链或点击「同步到 KV」发布快照。检查英文首页的原始 HTML；非英文页面不应包含友链。无需新建 KV 命名空间或修改现有绑定。

## 回归验证

```bash
pnpm exec node --import tsx scripts/verify-footer-links.ts
pnpm exec tsc --noEmit
pnpm cf:build
```

回归脚本使用隔离的本地 D1/KV 存储，覆盖参数校验、增改删、排序、KV 发布失败与重试，以及生产公开读取不查询 D1。
