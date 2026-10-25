# Cloudflare 部署准备

准备日期：2026-10-13。应用代码尚未发布，域名尚未绑定。

## 已创建的资源

| 资源            | 名称 / 绑定                 | ID                                     |
| --------------- | --------------------------- | -------------------------------------- |
| Worker 占位资源 | `car-wrap-design`           | 用于保存 Secrets、后续连接 Git         |
| D1              | `car-wrap-design-db` / `DB` | `39f68986-736b-4f18-8f7e-65920836eaee` |
| KV              | `CONFIG_KV`                 | `0cb06694728346bbbfa325c02105d241`     |

账号为 Double，生产地址为 `https://carwrapdesign.app`，静态资源地址为 `https://assets.carwrapdesign.app`。

初始迁移在 `drizzle/0000_perfect_mimic.sql`，已应用到线上及本地 D1，包含 30 张业务表。线上已导入 36 项测试环境配置和 4 个角色、29 个权限、34 条角色权限关联。配置中的 `app_url` 已替换为生产地址。

测试用户、订单、积分记录、设计内容和用户角色分配没有同步到线上。上线后需注册正式管理员，再为该用户分配 `super_admin` 角色。

## 配置读写

- Workers 运行时读取 `CONFIG_KV` 的 `car-warp-design:settings:v1` 快照，不查询 D1 配置表。缺失或损坏的快照会报错，避免静默切回 D1 或丢失供应商配置。
- 后台设置和自定义配置直接读取 D1，密钥值继续遮罩显示。
- 保存时先写入 D1，再将完整配置快照写入 KV。D1 保存采用原子 `batch`，其他数据库沿用事务。
- KV 写入失败时接口报错，数据库已保存的值仍可在后台查看，再次保存会重新发布快照，即使输入全是未修改的遮罩值。
- 密钥在生产 D1、KV 中均以 AES-GCM 密文保存；基础设施密钥仅来自 Worker Secrets。
- config 的 KV 读取缓存由 `src/modules/config/service.ts` 中的 `CONFIG_KV_CACHE_TTL_SECONDS` 控制，单位为秒，当前为 `24 * 60 * 60`（一天）。后台保存仍立即写入 KV，但已缓存旧值的其他区域可能在缓存到期后才看到更新，最长可能接近一天；这不是 KV 数据的过期删除时间。参见 [Cloudflare KV 读取文档](https://developers.cloudflare.com/kv/api/read-key-value-pairs/)。相同键每秒最多写一次，连续保存失败时应稍后重试。

`AUTH_SECRET` 和 `CONFIG_ENCRYPTION_KEY` 已写入 Worker Secrets。加密密钥必须保持稳定；修改后，已同步的设置将无法解密。私有备份在 `.wrangler/production-secrets.json`，本地预览使用 `.dev.vars`，这些文件均被 Git 忽略。

## Git 部署设置

提交包含公开资源绑定的 `wrangler.jsonc`、`drizzle/`、源码及部署文档。不要提交 `.env.production`、`.dev.vars`、`.wrangler/` 或本地数据库。

Cloudflare Workers Builds 使用：

```text
Build command: pnpm cf:build
Deploy command: pnpm exec wrangler deploy
Worker name: car-wrap-design
Root directory: /
```

`cf:build` 强制使用生产模式，并从 `wrangler.jsonc` 的 `vars` 注入公开构建变量，因此 Git 构建无需本地 `.env.production`。Nitro 会生成 `.output/server/wrangler.json` 和 `.wrangler/deploy/config.json`；Wrangler 自动使用生成的部署配置。

此次未添加域名路由。首次发布后，在 Cloudflare Worker 的 Domains & Routes 中绑定 `carwrapdesign.app`。线上 Secrets 已预建，连接 Git 时不要覆盖或重新生成配置加密密钥。

初始迁移已应用，无需再次导入测试配置。后续表结构修改先生成并检查迁移，再应用：

```bash
pnpm db:generate
pnpm exec wrangler d1 migrations apply car-wrap-design-db --remote --config wrangler.jsonc
```

线上注册管理员后，可按实际邮箱执行（替换示例邮箱并确认账号）：

```bash
pnpm rbac:init:remote --admin-email=YOUR_ADMIN_EMAIL
```

该命令通过 Wrangler 的 `DB` 绑定操作线上 D1，初始化默认角色与权限，并为已注册账号分配 `super_admin`。重复执行不会重复授权；账号不存在或执行失败时返回非零退出码。需要先登录 Wrangler（`pnpm exec wrangler login`）。`pnpm rbac:init` 保持按环境变量选择数据库；`DATABASE_PROVIDER=d1` 或显式传入 `--local` 时使用本地 D1。

## D1 业务兼容与验证

已通过：TypeScript 检查、Cloudflare 生产构建、隔离存储的真实本地 D1/KV 回归检查；线上配置数量、加密状态、KV 内容一致性、外键检查。

本地 workerd HTTP 预览：英文/中文首页、价格页、登录页、图库、公开配置、会话接口及后台未登录保护正常。通过一次性本地账号验证了注册、后台设置页、配置读取、密钥遮罩和保存到 D1/KV。未调用付费生成、支付、邮件或线上用户接口。自动浏览器因访问限制未完成视觉和客户端控制台检查。

生成、积分、支付与续费、邀请码、工单、用户资源及图库相关的事务已适配 D1：固定写入采用原子 `batch`，需要先读取业务状态的流程使用读取快照和提交时校验，状态变化后最多尝试三次。扣费、冻结、退款、生成完成及重复支付事件保留原子性和幂等检查。其他数据库继续使用原生事务。

原先的 D1 兼容层会将事务回调直接顺序执行，不能保证回滚；已移除这一行为。今后误用 D1 交互式事务会明确报错，应使用 `src/core/db/atomic.ts` 中的批处理机制。[Cloudflare D1 batch 文档](https://developers.cloudflare.com/d1/worker-api/d1-database/)说明批处理中任一语句失败会回滚整个批次。

已通过真实本地 D1 测试：并发扣减不透支、退款只恢复一次、生成幂等及完成失败整批回滚、支付及续费重复事件不重复授予积分、邀请码使用上限、并发上传额度、工单回滚和图库审核/重混/删除。AI、支付、图片下载及存储供应商使用测试替身；这些检查不代表真实付费供应商或生产业务验证。

最新本地 Worker 预览也通过英文、中文、德文、意大利文、韩文首页及公开 API 检查。Cloudflare 生产构建与部署 dry-run 成功，Worker gzip 为 2956.72 KiB。最终构建还通过一次性本地账号验证了会话、积分历史及工单创建/回复的原子写入，测试记录已清理。验证服务已关闭，3100 端口已释放。

配置与 D1 业务回归命令：

```bash
pnpm exec node --import tsx scripts/verify-config-kv.ts
pnpm exec node --import tsx scripts/verify-d1-business.ts
```

如明确需要重新同步本地测试设置，可运行准备脚本生成新的私有导入文件；它不会修改源数据库，也不会自动导入线上。已有线上业务设置后，应先备份并审核差异，避免被测试值覆盖。

```bash
pnpm exec node --import tsx scripts/prepare-cloudflare-config.ts
pnpm exec wrangler d1 execute car-wrap-design-db --remote --config wrangler.jsonc --file .wrangler/bootstrap/config.sql
pnpm exec wrangler kv key put car-warp-design:settings:v1 --binding CONFIG_KV --remote --config wrangler.jsonc --path .wrangler/bootstrap/config-kv.json
```
