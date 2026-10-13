# Car Wrap Design 本地 SEO 审计

审计日期：2026-10-11。对象：当前工作区，尚未发布的双语汽车车衣设计 SaaS。结论来自当前源码、`http://localhost:3000` 的 HTTP/SSR 输出和实际浏览器；未审计线上业务站点。仅参考 Google 官方文档解释规范。

## 结论

**核心营销内容基础较好，但建议处理 3 个高优先级项后再发布：图库跳转与 robots 冲突、公开作品发现链路依赖被屏蔽的 API、JSON-LD 用户内容输出缺少 HTML 安全转义。**

本地 SEO 就绪度暂评 **76/100**，为人工检查评分，不是 Lighthouse 分数、Google 评分或排名预测。性能没有有效实测，未计入分数；不能把本次结果视为生产 SEO/CWV 验收。

| 维度            | 人工分 | 原权重 | 依据                                                  |
| --------------- | -----: | -----: | ----------------------------------------------------- |
| 技术索引        |     66 |    22% | 图库抓取冲突、非搜索页 noindex、多语言 sitemap        |
| 内容质量        |     82 |    23% | 双语真实流程、产品截图及准确能力边界；作者背景待补    |
| 页面 SEO        |     85 |    20% | 26 个公开页面单 H1/标题/canonical；博客分享元信息欠缺 |
| 结构化数据      |     65 |    10% | 已有实体标记；输出转义及中文页面身份需修正            |
| 性能/CWV        | 未评分 |    10% | 未获取生产实验室或真实用户指标                        |
| AI 可引用就绪度 |     72 |    10% | 可读 SSR、步骤与 FAQ；作品发现、来源身份仍可增强      |
| 图片            |     78 |     5% | alt/WebP 基础好；详情 Blob 主图及博客尺寸预留有缺口   |

算法：已评估项目加权和 67.98 ÷ 90% = 75.53，四舍五入 76。分数用于排定工作，不抵消安全或索引缺陷的优先级。

## 覆盖与证据

- sitemap 当前有 13 个 `<loc>`：11 个固定路径 + 2 个本地公开作品；结合中文 alternate，共检查 **26 个公开页面**。
- 另检查 **11 个诊断路径**：登录、中文后台/工作台、预览工具、旧 AI 地址、4 类不存在地址，共 **37 个 HTML 样本**。
- 读取 robots.txt、sitemap.xml、llms.txt、llms-full.txt；从公开页面发现的其余内链均为编辑器/注册等非目标索引路径，没有为扩大数量抓取后台内容。
- 对 `/gallery` 额外禁用跟随跳转，确认 **307** 和 Location；检查默认首页公开纹理 GET 得到 **502**。
- 浏览器：中文首页桌面 1440×900，以及首页、AI 工具、指南移动端 390×844。各移动样本 `scrollWidth === clientWidth === 390`。截图见 [screenshots](screenshots/)。
- 现有 `scripts/audit-seo.ts` 对 10 个核心双语营销页面全部通过；该脚本不覆盖本报告发现的图库抓取、安全序列化和完整 sitemap 问题。
- 保存证据：[页面表](evidence/pages.csv)、[页面元数据与 JSON-LD](evidence/pages.json)、[robots](evidence/robots.txt)、[sitemap](evidence/sitemap.xml)、[现有脚本结果](evidence/legacy-audit.txt)。原始 HTML 临时保留于 `/tmp/carwrap-seo-audit/`。
- 已有缓存来自 2026-10-10，只有页面级历史结果；本次重新核实，没有沿用旧“通过”状态。

## 高优先级：上线前处理

### SEO-01：图库入口跳转到 robots 禁止的查询参数地址

**已确认。** `/gallery` 返回 307，Location 为 `/gallery?search=&vehicle=&sort=latest&page=1`，中文同样自动补默认参数。canonical 与 sitemap 指向无参数地址；robots 包含 `Disallow: /*?*`，因而最终目标被禁止抓取。

代码：[gallery/index.tsx](../../src/routes/gallery/index.tsx:19)、[robots 路由](../../src/routes/robots%5B.%5Dtxt.ts:21)。响应：[首跳 headers](evidence/gallery-initial.headers)。

建议默认参数不出现在 URL，使 `/gallery`、`/zh/gallery` 直接 200。针对搜索/筛选/分页分别设计规范地址与索引策略，避免屏蔽所有查询字符串；同一宽泛规则还匹配 `og-image.png?v=...`、favicon 等资源。分页若参与作品发现，应使用可抓取地址和合理 canonical。

验收：两个干净入口均直接 200、可抓取、canonical 自指；参数策略和 sitemap 无冲突。Google 的 JavaScript 渲染也受 robots 资源限制，不能期待客户端渲染绕过它。[官方说明](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

### SEO-02：社区作品内链没有 SSR，列表和关键图片依赖被屏蔽的 API

**已确认。** 首页与图库 EN/ZH 首份 HTML 均为 0 个 `/gallery/<slug>` 作品详情链接；浏览器运行 JavaScript 后首页出现 2 个作品详情链接。图库 loader 只返回 locale，列表依赖 `/api/gallery`，robots 却禁止 `/api/`。分页是 button/onClick。车型页的共享 GalleryPreview 也沿用相同客户端模式。

代码：[gallery loader/query](../../src/routes/gallery/index.tsx:31)、[GalleryPreview](../../src/blocks/gallery-preview.tsx:23)、[分页](../../src/routes/gallery/index.tsx:229)。

建议 route loader 提供公开作品数据，SSR 首屏及分页的真实 `<a href>`；保留权限检查，不开放全部 API。首页和车型推荐也提供适量 SSR 作品内链。Google 通常通过带 href 的锚点发现页面，按钮不是同等替代。[链接规范](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)

图片子项：两张作品详情都有 SSR 标题/作者/正文和 ImageObject，但主作品图要等客户端 effect 获得 Blob 才渲染，首份 HTML 的 img 仅有全站 logo。建议公开详情先显示有稳定公开 URL 的封面/图片，再增强为 3D；不要为 SEO 公开私有文件。[详情图片链路](../../src/routes/gallery/$designSlug.tsx:164)

**边界：不是断言作品详情完全不能收录。** 详情已 SSR，sitemap 也有直接发现入口；问题是公开作品的列表发现和图像关联较弱。

### SEO-03：JSON-LD 用户内容可能提前闭合 script 标签

**已确认危险输出，不是已执行线上攻击。** StructuredData 将 `JSON.stringify(data)` 原样写入 `dangerouslySetInnerHTML`；作品 title 与作者名会进入此组件。真实组件的本地 SSR 无害 marker 输入含 `</script><p ...>` 时，输出保留原始结束标签，能突破 JSON-LD 节点边界。没有写数据库、没有执行攻击脚本。

代码：[structured-data.tsx](../../src/components/seo/structured-data.tsx:5)、[作品 schema 输入](../../src/routes/gallery/$designSlug.tsx:483)。

建议共用序列化器将 `<` 转为 JSON Unicode 转义 `\u003c`，保持 JSON 可解析；增加包含 `</script>` 的针对性回归检查。可破坏结构化数据并带来存储型 HTML/XSS 风险，应先于一般 SEO 美化处理。普通当前内容的 schema 均能解析，不代表输入安全。

## 中优先级：上线准备与近期优化

### SEO-04：非搜索页面索引边界不完整

`/zh/sign-in`、`/zh/admin`、`/zh/dashboard`、`/cover-preview` 本地均返回 200，初始 HTML 没有 noindex。robots 只有无语言前缀规则，不能匹配中文路径；后台登录跳转发生在客户端 effect。

建议在初始响应定义非搜索页 noindex，后台考虑服务端鉴权跳转；调试预览页按实际生产需求禁用、鉴权或明确 noindex。并检查 forgot/reset/verify/auth-callback/redeem-invite 等同类路由。不应把 disallow 当作保证不收录：需要爬虫能读取 noindex 才能生效。[Google noindex 说明](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

证据：[后台 layout](../../src/components/app-layout.tsx:76)、[cover-preview](../../src/routes/cover-preview.tsx:7)。这次没有确认任何私人数据泄漏，确认的是可索引空壳/工具页风险。

### SEO-05：多语言 sitemap 缺中文独立条目

当前 13 个 loc 全是英文，中文只在 alternate；20/26 个公开页面有 HTML hreflang，博客正文和法律页没有，较依赖 sitemap。应对每个存在的语言 URL 输出独立 `<url><loc>` 并列出相同双向 alternates，当前应为 26 条。Google 多语言 sitemap 指南要求为每个 URL 创建独立条目。[官方规范](https://developers.google.com/search/docs/specialty/international/localized-versions)

代码：[sitemap 生成](../../src/routes/sitemap%5B.%5Dxml.ts:42)。HTML 与 sitemap 不必都实现 hreflang，但至少一套必须完整。`zh` 有效、x-default 可选；不能把这两点误报为错误。

### SEO-06：中文车型页 schema 仍指向英文页面

中文 Tesla/Model 3/Model Y 可见名称与 canonical 指向中文，但页面级 schema 的 URL/breadcrumb item 使用不带 locale 的路径。应使用已有 localizedAbsoluteUrl，与当前页面身份对齐；Organization 的全站共用 @id 可以维持不变。

代码：[vehicle-landing-page.tsx](../../src/components/marketing/vehicle-landing-page.tsx:398)。

### SEO-07：首页默认车衣纹理在本地加载失败

桌面和移动首页均显示“这款车衣暂时无法加载”，3D 白车模型本身正常。公开 GET `/api/gallery/ani-07f0c209?texture=1` 返回 502，见 [响应](evidence/hero-texture.headers) 与 [桌面截图](screenshots/home-desktop.png)。

这是已观察到的本地体验故障，会弱化第一屏的产品演示；不等同于 R2 加密模型解密失败，也不直接证明线上同样失败。发布前排查纹理上游与本地资源配置，确认真正展示作品贴图；本轮不扩展为功能修复。

### SEO-08：博客封面未预留比例；3D 首屏性能仍需量化

博客封面实际 1600×900，约 129 KB，但 img 没有 width/height 或 aspect-ratio，冷加载存在布局位移风险。补真实尺寸或 16:9 容器即可。[博客封面](../../src/routes/blog/$slug.tsx:93)

首页 3D 虽 lazy 拆包，却立即挂载，移动端也加载；现有构建的 viewer chunk 约 1.18 MB raw / 317 KB 离线 gzip，主 index 约 683 KB / 210 KB。构建时间早于最近模型配置修改，**这些仅是历史构建体积参考，不是实际传输或 CWV 实测**。已有 DPR 限制、可见性检测、按需帧渲染，应保留。后续用当前生产构建测慢速移动环境，再决定是否采用静态 poster + 视口/交互加载。

不报告虚构的 LCP/INP/CLS 或 Lighthouse 分。页面当前未观察到横向溢出不等于 CLS 已达标。

## 低优先级与增强机会

- **SEO-09 / 博客展示**：文章有标题、canonical、简介、可见日期、团队署名，但没有专属 OG/Twitter 和 BlogPosting。可按真实文章字段补齐，维护时显示真实修改日期；属于分享与语义增强，不是收录硬条件。[文章模板](../../src/routes/blog/$slug.tsx:25)
- **SEO-10 / 信任与作者**：支持邮箱、隐私条款已有。未来补真实运营者介绍/编辑说明及作者链接，避免虚构专家、客户评价或地址；没有 About 不意味着无法收录。
- **SEO-11 / Sitemap 维护**：作品 lastmod 用 publishedAt，重新发布不会表达实际更新；用公开内容实际修改时间或省略。博客路径硬编码，当前唯一文章已覆盖，新增 MDX/后台文章时需统一发布源，不能报告为现在已漏大量文章。
- **SEO-12 / 图片与资源**：图片均有 alt（装饰图空 alt 合理）；WebP、缩略图及多处尺寸/lazy 已有。可为大截图和图库卡片按需补响应式尺寸；隐藏 hover 纹理图也可能下载，值得后续优化。20px 作者头像使用 800px logo，可换小资源。
- **SEO-13 / 可选 GEO 文件**：llms 文件存在，但仍只列 Home/Pricing/Blog，缺核心 AI/车型/Gallery，llms-full 不含本地 MDX 正文。如维护该文件可补齐，但不将它视为搜索收录或 AI 引用保证。

## 内容与搜索意图评价

首页负责在线设计，AI 页面直接提供生成入口，车型页有车型/年款差异，指南提供真实操作流程，Gallery 承载独特作品；站内任务分工合理。没有做 SERP/关键词需求研究，不能声称竞争词排名机会或页面类型与搜索结果完全匹配。

已有双语指南具备实际界面截图、流程、排错、Tesla 官方来源与数字设计/实体施工边界；免费编辑器与积分 AI 区分清晰；AI 平面图内部不能独立编辑与手动图层可编辑的说明准确。无需整体重写、机械增加字数或追求 1–3% 关键词密度。现有脚本的密度/字数通过仅代表项目自设检查。

社区上线前再核实 **100+** 展示承诺与访客可浏览的审核通过作品数量；用户已明确会补充，审计保留该文案，不建议擅自改值。新增作品应有真实名称、配色、车型/年款和简短创作说明，避免大量仅标题不同的模板页。

内容扩充优先考虑真实样例支持的导入排错、参考图前后对比、年款/模板选择教程；不要仅换车型词批量造页面。

## 已通过与不应误报

- 26 个公开样本均最终 200、单一 H1、单一 title/canonical、正确 HTML lang；其中图库入口的 307 问题单列。
- 核心营销正文在 SSR 中，已有内链、语义标题和准确产品能力说明。
- 4 个不存在路径样本均真正 404；旧 AI 地址有迁移到新路径的重定向。
- 公开作品与 sitemap 按 public/approved/未删除过滤；分享页有 noindex，未放入 sitemap。
- 14/26 公开页面有 JSON-LD，正常内容均可 JSON 解析；无伪造评分。
- 本地 canonical/sitemap 指向 localhost:3100 是 `.env` 配置结果，不能当作已上线域名错误。发布时确认正式 `VITE_APP_URL`；不要为此次本地审计修改用户环境。
- FAQPage/HowTo 未被滥用。现有 WebApplication 可有语义价值，但缺少真实评分/评论等时不能承诺 Google 软件富结果资格，也不该为过检测补假评分。[Google 软件应用规范](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- priority/changefreq、缺少 IndexNow、未批量加城市页，都不是本项目的发布阻塞。

## 尚未验证与交付边界

没有部署、没有付费 API 调用、没有修改产品代码或用户数据，也没有重启/停止用户现有 3000 开发服务。仅保存报告、截图和本地 SEO 缓存。审计使用当前 dev SSR；未重新 build，因为没有应用代码修改，也不会用 dev 时延充当生产性能结果。

未验证：线上 Google/Bing 收录、GSC/GA4、CrUX、实际搜索量/排名/外链、生产 CDN/WAF/HTTPS/缓存响应、生产社区数量、正式 robots 与 canonical。未运行 Rich Results Test，也未确认任何富结果资格通过。生产上线后需单独验证这些环节。

手机截图仅覆盖上述三个页面，不能代表全部设备、全部路由都已视觉验收。首屏纹理故障是本地复现状态，需功能排查后再验收。
