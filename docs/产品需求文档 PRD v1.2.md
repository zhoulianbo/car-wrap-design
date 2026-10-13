# EV Wrap Visualizer 产品需求文档 PRD v1.1

**版本：** v1.2  
**日期：** 2026-09-27  
**产品阶段：** MVP / B2C / Creator-first  
**目标用户：** Tesla 及主流中国电动车车主、汽车改色爱好者、Wrap 设计爱好者、准备做车衣/改色的潜在消费者  
**产品形态：** Web App / Mobile-first / 全球多语言  
**核心目标：** 验证“高质量 3D 车型 + UV 编辑器 + AI Wrap 生成 + Gallery 社区内容”是否能够形成用户创作、分享、浏览、再创作的增长闭环，并通过 AI Credits 等轻量方式尽早验证付费意愿。
**域名：** carwrapdesign.app

---

# 1. 产品摘要

## 1.1 一句话定位

一个面向全球热门电动车的在线 3D Wrap 创作平台：

> 选择车型 → 选择车衣材质或进入 UV 编辑器 → 手动设计 / AI 生成 Wrap → 实时 3D 预览 → 保存 / 发布到 Gallery → 分享 / Remix。

产品第一阶段保持 B2C、轻量、自助使用，不做 Wrap Shop CRM、不做门店报价、不做 B2B White Label，也不依赖线下门店合作才能成立。

与 v1.0 不同，MVP 不再只是“改颜色预览工具”。

**UV 编辑器、AI Wrap Generator、Gallery 必须进入 MVP。**

原因：

- 单纯 3D 改色容易成为一次性工具；
- UV 编辑器提供真正的创作能力；
- AI 生成降低设计门槛；
- Gallery 把单次使用转化为可积累的 UGC；
- Gallery → Remix / Create → Publish → Share 可以形成增长循环。

核心体验目标：

**新用户进入网站后 1 分钟内，能够完成一次“创建或 AI 生成 → 3D 预览 → 保存/分享”的完整体验。**

---

# 2. 市场分析

## 2.1 EV 是合适的垂直切入口

2025 年全球电动车仍处于快速增长阶段，中国车企在全球电动车市场中的占比继续提高。

本产品第一阶段没有必要覆盖“所有汽车”。

更适合独立开发者的路径是：

**EV → 高销量 EV → Tesla + 中国品牌 EV → 为这些车型建立高质量 3D 资产、Wrap UV 和创作能力。**

第一阶段的壁垒不是“车型最多”，而是：

**少量热门车型 + 更好的创作体验 + 更好的 UGC 增长能力。**

## 2.2 首批车型策略

首发车型：

1. Tesla Model Y
2. Tesla Model 3
3. 吉利星愿 / Geely EX2
4. 五菱宏光 MINIEV
5. BYD Seagull / Dolphin Surf / Dolphin Mini
6. MG4 EV
7. BYD Dolphin

多语言和地区别名同时用于产品体验和 SEO。

## 2.3 用户需求

### A. 决策型需求

> “我的车贴成这个颜色会是什么效果？”

流程：

**车型 → 材质/颜色 → 3D 预览 → 保存/分享**

### B. 创作型需求

> “我想做一个别人没有的 Wrap 设计。”

流程：

**车型 → UV 编辑 / AI 生成 → 3D 预览 → 发布 Gallery → 分享 / Remix**

v1.1 重点是：

**同时覆盖 A + B，并让 B 成为增长引擎。**

---

# 3. 竞品分析

## 3.1 Tesla Wrap Designer

Tesla Wrap Designer 已经提供：

- Tesla 多车型；
- 3D Preview；
- UV / 2D 编辑；
- AI 生成；
- PNG 导出；
- 多语言；
- Community Gallery；
- 用户账户和云端项目；
- AI Credits；
- Affiliate。

其最值得借鉴的不是单一 3D 技术，而是：

**免费创作工具 → AI 降低创作门槛 → 用户发布设计 → Gallery 累积内容 → 新用户浏览 / Remix → 再创作。**

### MVP 应学习

- 3D Viewer；
- UV 编辑器；
- AI 生成；
- Gallery；
- 用户项目保存；
- Share；
- Remix；
- 多语言；
- 基础 Credits。

### MVP 暂不做

- Paint Shop 专用输出工作流；
- 评论；
- 私信；
- Follow；
- 复杂社交关系；
- Affiliate；
- B2B；
- Installer Lead。

## 3.2 Tesla Wrap Gallery / tesla-wrap.com

其方向更偏：

**AI Prompt → Wrap Design → Gallery**

这说明 AI 很适合作为普通消费者的第一入口。

本产品不在 UV 编辑器和 AI 之间二选一，而是：

```text
AI Generate
    ↓
生成设计草案
    ↓
Open in Editor
    ↓
UV 编辑器继续调整
    ↓
3D Preview
    ↓
Publish
```

## 3.3 Avery Dennison Car Wrap Visualizer

其优势主要在：

- 真实膜色；
- 实际 Wrap 场景；
- 安装商连接。

本项目 MVP 暂不把线下施工转化作为核心。

第一阶段优先：

**创作 + 展示 + 分享。**

## 3.4 WrapConfigurator

该类产品已经覆盖大量车型、大量真实车衣 SKU 和 Installer Lead。

因此本产品不以“车型最多 / 膜色最多”竞争。

差异化：

**热门 EV + 高质量 3D + AI 创作 + UV 编辑 + Gallery。**

## 3.5 3D Changer

偏专业设计师和 Wrap Shop。

本项目第一阶段不进入专业生产软件市场。

UV 编辑器要“够用”，但不做成 Photoshop / Illustrator 替代品。

---

# 4. 市场切入点

## 4.1 产品定位

不再只是：

> EV Wrap Visualizer

更准确的表达：

> **Create, preview and share wraps for the world's most popular EVs.**

中文：

> **为全球热门电动车创建、预览和分享 Wrap 设计。**

## 4.2 核心差异化

### 1. EV First

优先高销量 EV。

### 2. 中国 EV First

重点覆盖：

- Geely Xingyuan / EX2
- BYD Seagull / Dolphin Surf / Dolphin Mini
- BYD Dolphin
- MG4 EV
- Wuling Hongguang MINIEV

### 3. Real-time 3D

所有设计最终都回到高质量 3D Viewer 中预览。

### 4. UV Editor

支持：

- 上传图片；
- 文字；
- 图形；
- Sticker；
- 图层；
- 移动 / 缩放 / 旋转；
- 实时同步 3D。

### 5. AI Wrap Generator

自然语言生成 Wrap 设计：

> Midnight purple cyberpunk wrap with subtle neon blue lines.

核心路径：

**Generate → Preview → Edit → Publish**

### 6. Gallery / UGC

每个公开作品都可以形成：

- 独立详情页；
- 分享链接；
- Remix；
- 车型关联；
- 作者关联；
- SEO 页面；
- Google Images 素材。

### 7. Real Wrap Materials

支持：

- Gloss
- Matte
- Satin
- Metallic
- Pearl
- Color Shift
- Chrome

真实膜品牌 SKU 延后。

### 8. Global Model Alias

例如：

BYD Seagull  
= BYD Dolphin Surf  
= BYD Dolphin Mini

Geely Xingyuan  
= Geely EX2

---

# 5. 产品商业画布

| 模块         | 定义                                                                                   |
| ------------ | -------------------------------------------------------------------------------------- |
| 客户细分     | Tesla / 中国 EV 车主、Wrap 爱好者、改色消费者、设计爱好者、AI 创作者                   |
| 核心价值     | 不需要专业设计能力，即可为真实车型设计 Wrap，并即时看到高质量 3D 效果                  |
| 产品关系     | Self-service、社区浏览、创作驱动                                                       |
| 获客渠道     | Google SEO、Google Images、Gallery UGC、Pinterest、TikTok、Instagram、Reddit、车型社区 |
| MVP 收入来源 | AI Credits；后续增加 HD 导出、Premium Templates                                        |
| 延后收入来源 | Affiliate、膜样购买、Installer Lead、B2B White Label                                   |
| 核心资源     | 高质量 3D 车型、UV 模板、材质库、AI 生成、UGC Gallery                                  |
| 核心活动     | 车型资产、UV 模板、编辑器、AI、Gallery、SEO                                            |
| 合作伙伴     | 3D 模型作者、AI 模型/API 服务商                                                        |
| 成本结构     | 3D 模型、资产处理、AI API、R2/CDN、数据库、支付、内容审核                              |

第一阶段：

**创作者和车主是核心用户；门店和膜品牌不是 MVP 的前置条件。**

---

# 6. 接入车型

| 品牌   | 车型                                  | MVP 版本         |
| ------ | ------------------------------------- | ---------------- |
| Tesla  | Model Y                               | 2025+ Juniper    |
| Tesla  | Model 3                               | 2024+ Highland   |
| Geely  | Xingyuan / EX2                        | 当前海外版       |
| Wuling | Hongguang MINIEV                      | 一个确定车身版本 |
| BYD    | Seagull / Dolphin Surf / Dolphin Mini | 全球对应版本     |
| MG     | MG4 EV                                | 欧洲主销版本     |
| BYD    | Dolphin                               | 全球版           |

总计：

**7 个首发 3D 车型资产。**

Tesla Model S、Model X、Cybertruck 后续增加。

---

# 7. 车型资产与 UV 规范

车型数据必须支持：

```text
brand
model
generation
modelYear
market
aliases
uv_version
asset_version
```

## 7.1 Mesh 拆分

至少：

```text
BODY / BODY PANELS
GLASS
LIGHT_FRONT
LIGHT_REAR
WHEEL
TIRE
TRIM
CHROME
INTERIOR_VISIBLE
```

建议进一步拆：

```text
HOOD
FRONT_BUMPER
REAR_BUMPER
FENDER_FL
FENDER_FR
DOOR_FL
DOOR_FR
DOOR_RL
DOOR_RR
QUARTER_L
QUARTER_R
TRUNK / TAILGATE
MIRROR_L
MIRROR_R
ROCKER_L
ROCKER_R
```

这样可支持 Hover、高亮、单独编辑和局部 Wrap。

## 7.2 UV 要求

MVP 必须为所有可包膜车身建立 Wrap UV。

要求：

- 主要车身区域完整展开；
- 左右车身不能简单镜像共用同一 UV；
- 尽量避免重叠；
- Panel 位置稳定；
- Texel Density 尽量一致；
- 可导出 UV Template；
- 3D Viewer 与 Editor 使用同一套 Wrap UV。

建议：

```text
TEXCOORD_0 = 原始模型材质
TEXCOORD_1 = Wrap UV
```

---

# 8. MVP 核心增长闭环

产品不再是：

```text
Search
→ Viewer
→ Change Color
→ Leave
```

而是：

```text
Search / Social / Gallery
        ↓
Choose a Car
        ↓
Preview / Create
        ↓
┌──────────────────┐
│ UV Editor        │
│ AI Generator     │
└──────────────────┘
        ↓
3D Preview
        ↓
Save Project
        ↓
Publish to Gallery
        ↓
Share
        ↓
Other users discover
        ↓
Remix
        ↓
Create again
```

**Gallery 是增长中心，不只是作品展示页。**

---

# 9. MVP 用户路径

## 9.1 快速改色

首页 / 车型页  
→ Choose your car  
→ 选择颜色 / Finish  
→ 3D Preview  
→ Save / Share / Open in Editor

## 9.2 UV 手动创作

Choose your car  
→ Create Wrap  
→ UV Editor  
→ 图片 / 文字 / 图形 / Sticker  
→ 图层编辑  
→ 3D 实时预览  
→ Save  
→ Publish to Gallery  
→ Share

## 9.3 AI 创作

Choose your car  
→ AI Wrap Generator  
→ Prompt  
→ 可选 Style / Base Color  
→ AI Generate  
→ 1–4 个结果  
→ Preview on Car  
→ Open in UV Editor  
→ Save / Publish / Share

## 9.4 Gallery / Remix

Gallery  
→ Design Detail  
→ 查看车型、作者、封面、Prompt（可选公开）  
→ Remix This Design  
→ 克隆为新 Project  
→ Editor / AI Generator  
→ 修改  
→ 再次发布

---

# 10. MVP 功能需求

## 10.1 车型选择

支持：

- Brand
- Model
- Generation
- Region alias

URL 必须 SEO Friendly。

## 10.2 高质量 3D Viewer

必须支持：

- Rotate
- Zoom
- Auto Rotate
- Reset Camera
- Full Screen
- Mobile Touch
- Responsive Canvas
- Panel Hover
- Panel Selection
- Panel Highlight
- 局部换色
- 实时 Canvas Texture 更新

渲染要求：

- MeshPhysicalMaterial；
- HDRI / Studio Softbox；
- ACES Tone Mapping；
- Glass / Light / Wheel 独立材质；
- Contact Shadow；
- 30–40° Camera FOV。

## 10.3 Wrap Material Selector

MVP：

**40–60 个精选颜色。**

Finish：

- Gloss
- Matte
- Satin
- Metallic
- Pearl
- Color Shift

## 10.4 UV Editor

这是 MVP 核心功能。

推荐：

**Konva.js + HTML Canvas**

布局：

```text
┌───────────┬─────────────────────┬──────────────┐
│ Tools     │ UV Canvas           │ 3D Preview   │
│ Upload    │                     │              │
│ Text      │                     │              │
│ Shapes    │                     │              │
│ Sticker   │                     │              │
│ AI        │                     │              │
│ Layers    │                     │              │
└───────────┴─────────────────────┴──────────────┘
```

P0：

- 上传图片；
- 添加文字；
- 基础图形；
- Sticker；
- Drag；
- Scale；
- Rotate；
- Flip；
- Opacity；
- Layer Order；
- Delete；
- Duplicate；
- Undo / Redo；
- Canvas Zoom；
- Reset View。

必须做到：

**2D Canvas 更新后，3D Viewer 在可接受延迟内同步刷新。**

暂不做：

- Pen Tool；
- Bezier；
- 高级路径编辑；
- Photoshop 级蒙版；
- 专业印刷色彩工作流。

## 10.5 AI Wrap Generator

输入：

```text
Car Model
Prompt
Optional Style
Optional Base Color
```

输出：

**1–4 个候选设计。**

支持：

- Preview；
- Regenerate；
- Apply；
- Open in Editor；
- Save；
- Publish。

推荐流程：

```text
Prompt
↓
AI 生成 Wrap Pattern / Design Asset
↓
进入车型 Wrap UV 工作区
↓
3D Preview
↓
UV Editor 二次调整
```

MVP 不要求 AI 一次生成专业施工级 UV 图。

AI 使用 Credits 控制成本，并从 MVP 开始验证付费。

## 10.6 用户账户

支持：

- Google Login；
- Email Login；
- Profile；
- My Projects；
- My Published Designs。

无需登录即可：

- 浏览 Gallery；
- 使用基础 Viewer。

以下操作要求登录：

- Save；
- Publish；
- Remix 后保存；
- AI Credits；
- 管理作品。

## 10.7 Project Save

保存：

```text
vehicle_id
project_name
canvas_json
wrap_texture
preview_image
created_at
updated_at
```

Canvas JSON 必须可以重新进入编辑器继续编辑。

## 10.8 Gallery

MVP：

- Latest；
- Popular；
- AI Generated；
- By Vehicle；
- Design Detail；
- Author；
- Share；
- Remix。

Gallery Card：

- Cover；
- Vehicle；
- Design Title；
- Author；
- AI / Manual 标签；
- Remix CTA。

暂不做：

- 评论；
- 私信；
- Follow。

## 10.9 Publish

发布字段：

- Design Title；
- Description（可选）；
- Tags；
- Public / Unlisted；
- AI Generated；
- 是否公开 Prompt；
- Cover Image。

公开地址：

```text
/{locale}/gallery/{designSlug}
```

## 10.10 Remix

Gallery Detail 必须有：

**Remix This Design**

流程：

- 克隆公开 Project；
- 创建当前用户的新 Project；
- 保留 `remix_from_design_id`；
- 打开 UV Editor；
- 用户继续修改。

## 10.11 Screenshot / Export

支持：

- 16:9
- 1:1
- 9:16

免费导出可以带小 Watermark。

后续将：

- HD；
- 无水印；
- Premium Background

作为付费功能。

## 10.12 Shareable URL

Viewer：

```text
/cars/tesla/model-y/wrap-visualizer?color=satin-green
```

Gallery：

```text
/gallery/midnight-cyber-model-y
```

Project 默认私有。

## 10.13 基础内容审核

Gallery 涉及 UGC，MVP 必须有：

- Report；
- Hide / Unpublish；
- 管理员审核入口；
- AI 供应商内容安全；
- UGC Terms。

---

# 11. MVP 明确不做

MVP 暂不做：

- Wrap Shop CRM；
- Installer Dashboard；
- 在线施工报价；
- Installer Lead；
- Affiliate；
- B2B White Label；
- VR；
- AR；
- Native App；
- 专业印刷输出；
- CMYK / RIP；
- Photoshop 级高级编辑；
- Pen / Bezier；
- 评论；
- 私信；
- Follow；
- 复杂排行榜；
- 复杂 PPF 模拟。

以下不再属于“后续”，而是 MVP：

- UV Editor；
- AI Wrap Generator；
- Gallery；
- Account；
- Project Save；
- Publish；
- Remix。

---

# 12. 技术方案

## 12.1 推荐技术栈

```text
Next.js
TypeScript
React
React Three Fiber
Three.js
Drei
Konva.js
Tailwind CSS
next-intl

Supabase Auth
PostgreSQL / Supabase
Cloudflare R2
Cloudflare CDN / Workers

AI Image Generation API
Payment Provider
PostHog
```

## 12.2 3D 技术

格式：

**GLB / glTF 2.0**

加载：

```text
GLTFLoader
```

压缩：

```text
Draco / Meshopt
KTX2
```

Wrap UV：

```text
TEXCOORD_1
```

原始模型：

```text
TEXCOORD_0
```

## 12.3 UV 编辑器

结构：

```text
Stage
 ├─ UV Guide Layer
 ├─ Background Layer
 ├─ User Image Layers
 ├─ Text Layers
 ├─ Shape Layers
 └─ Selection / Transformer Layer
```

Project 保存：

```text
Konva Stage JSON
+
Asset references
+
Vehicle UV version
```

3D Preview：

```text
Konva Canvas
↓
CanvasTexture
↓
Three.js
↓
Wrap Material
```

性能策略：

- 操作时低分辨率 Preview；
- 停止操作后刷新高分辨率 Texture；
- Export 时生成完整分辨率。

## 12.4 AI 生成

```text
Create Generation
↓
AI API
↓
Result Images
↓
R2
↓
Generation Record
↓
Apply to Project
```

状态：

```text
queued
processing
succeeded
failed
```

MVP 使用轮询即可，不引入复杂 Agent 框架。

## 12.5 核心数据对象

建议：

```text
users
vehicles
vehicle_uv_templates
wrap_materials
projects
project_assets
ai_generations
designs
design_tags
design_remixes
reports
credit_transactions
```

其中：

**Project = 可编辑草稿**

**Design = Gallery 中公开作品**

两者不要混成同一张表。

## 12.6 性能目标

3D：

- Desktop GLB ≤ 15MB；
- Mobile 尽量 ≤ 8–12MB；
- 100k–300k triangles；
- Texture ≤ 2K；
- KTX2；
- DPR ≤ 1.5；
- on-demand rendering。

UV Editor：

- UI 操作目标 ≥ 50 FPS；
- 上传大图后客户端先压缩；
- Preview Texture 与 Export Texture 分离。

Gallery：

- Cover 使用 WebP/AVIF；
- Gallery 列表不加载 3D；
- 只有 Detail / Editor 才加载 GLB。

---

# 13. 多语言

MVP：

- English
- Chinese

Growth：

- Spanish
- Portuguese
- German
- French

URL：

```text
/
/zh/
/es/
/pt/
/de/
/fr/
```

所有公开页面支持：

- hreflang；
- canonical；
- localized title；
- localized description。

---

# 14. 网站导航结构

导航围绕：

**Create / AI / Gallery**

而不是 B2B 或商业服务。

## 14.1 Desktop 顶部导航

```text
[Logo]

Create
AI Generator
Gallery
Cars
Wrap Colors

----------------------------

Search
My Projects
Credits
Avatar / Sign in
```

优先级：

1. **Create** — Primary CTA
2. AI Generator
3. Gallery
4. Cars
5. Wrap Colors

## 14.2 Mobile 导航

顶部：

```text
Logo
[Create]
[Menu]
```

Menu：

```text
AI Generator
Gallery
Cars
Wrap Colors
My Projects
Credits
Language
Sign in / Account
```

进入 Editor 后，不显示完整营销导航。

Editor 顶部：

```text
Back
Project Name
Save Status
Preview
Undo
Redo
Export
Publish
```

移动端 Editor 使用底部工具栏。

## 14.3 一级页面结构

```text
/
├─ /create
├─ /ai-wrap-generator
├─ /gallery
├─ /cars
├─ /wrap-colors
├─ /pricing
├─ /login
├─ /account
└─ /projects
```

### Create

```text
/create
/create/{vehicleSlug}
```

### AI Generator

```text
/ai-wrap-generator
/ai-wrap-generator/{vehicleSlug}
```

### Gallery

```text
/gallery
/gallery/{designSlug}
/gallery/latest
/gallery/popular
/gallery/ai
/gallery/vehicle/{vehicleSlug}
/gallery/tag/{tagSlug}
```

### Cars

Cars 不只是车型选择目录，也是 SEO 的核心入口。

```text
/cars
/cars/{brandSlug}
/cars/{brandSlug}/{modelSlug}
```

其中：

**`/cars/{brandSlug}/{modelSlug}` 必须是每个车型独立、可索引的 SEO Landing Page，而不是简单跳转到 Editor。**

MVP 首批车型至少建立：

```text
/cars/tesla/model-y
/cars/tesla/model-3
/cars/geely/ex2
/cars/wuling/hongguang-miniev
/cars/byd/seagull
/cars/mg/mg4-ev
/cars/byd/dolphin
```

车型独立页面至少提供：

- 车型专属 Hero；
- 高质量 3D Preview；
- Popular Wrap Colors；
- Featured Gallery Designs；
- AI Wrap 示例；
- Create Wrap CTA；
- Generate with AI CTA；
- 车型相关 Wrap 内容；
- FAQ；
- Related Cars。

工具入口独立：

```text
/create/{vehicleSlug}
/ai-wrap-generator/{vehicleSlug}
```

用户可以从车型落地页进入 Editor / AI Generator，但 SEO 流量首先落到车型 Landing Page。

这样页面既承担：

**Search Landing Page**

又承担：

**车型内容 Hub + 创作转化入口。**

### Wrap Colors

```text
/wrap-colors
/wrap-colors/{colorSlug}
```

## 14.4 登录后用户导航

Avatar：

```text
My Projects
My Designs
Credits
Account
Language
Sign out
```

My Projects：

```text
/projects
/projects/{projectId}/edit
```

My Designs：

```text
/account/designs
```

## 14.5 Editor 内部结构

Desktop：

```text
┌──────────────────────────────────────────────────┐
│ Back   Project Name       Save       Export Publish│
├─────────────┬────────────────────────┬─────────────┤
│ Tools       │ UV Canvas              │ 3D Preview  │
│ Upload      │                        │             │
│ Text        │                        │             │
│ Shapes      │                        │             │
│ Stickers    │                        │             │
│ AI          │                        │             │
│ Layers      │                        │             │
└─────────────┴────────────────────────┴─────────────┘
```

AI 不与 Editor 完全割裂。

Editor 左侧保留 AI 入口：

```text
手动编辑
→ AI 生成素材
→ 放入 Canvas
→ 再编辑
```

---

# 15. SEO 产品结构

SEO 不只依赖首页、Gallery 或通用工具页。

**每一个支持的车型都必须有自己独立、可索引的车型 Landing Page。**

车型页是整个 SEO 架构的核心 Hub，Gallery、AI Generator、UV Editor、Wrap Colors 都通过内部链接与车型页建立关系。

## 15.1 SEO 页面层级

建议结构：

```text
/{locale}/cars
/{locale}/cars/{brandSlug}
/{locale}/cars/{brandSlug}/{modelSlug}

/{locale}/create/{vehicleSlug}
/{locale}/ai-wrap-generator/{vehicleSlug}

/{locale}/gallery
/{locale}/gallery/{designSlug}
/{locale}/gallery/vehicle/{vehicleSlug}
/{locale}/gallery/tag/{tagSlug}

/{locale}/wrap-colors
/{locale}/wrap-colors/{colorSlug}
```

其中：

```text
/{locale}/cars/{brandSlug}/{modelSlug}
```

是**车型主 Landing Page / Canonical Hub**。

不要把它做成只有一张车图和一个“Start”按钮的薄页面。

---

## 15.2 MVP 独立车型 Landing Pages

首批 7 个车型必须全部上线独立页面：

```text
/cars/tesla/model-y
/cars/tesla/model-3
/cars/geely/ex2
/cars/wuling/hongguang-miniev
/cars/byd/seagull
/cars/mg/mg4-ev
/cars/byd/dolphin
```

中文：

```text
/zh/cars/tesla/model-y
/zh/cars/tesla/model-3
/zh/cars/geely/xingyuan
/zh/cars/wuling/hongguang-miniev
/zh/cars/byd/seagull
/zh/cars/mg/mg4-ev
/zh/cars/byd/dolphin
```

不同语言可以采用当地更常见的车型名称，但必须通过车型实体 ID 关联到同一个底层 Vehicle。

---

## 15.3 每个车型页的关键词意图

车型 Landing Page 的核心搜索意图：

```text
{Model} wrap
{Model} wrap ideas
{Model} wrap colors
{Model} wrap design
{Model} wrap visualizer
{Model} car wrap
```

例如 Model Y：

```text
Tesla Model Y wrap
Tesla Model Y wrap ideas
Tesla Model Y wrap colors
Tesla Model Y wrap design
Tesla Model Y wrap visualizer
```

车型页负责承接“车型 + Wrap”这一大类核心意图。

不要让 `/create/...`、`/ai-wrap-generator/...` 和车型页全部竞争同一个主关键词。

建议进行关键词意图分工：

| 页面                               | 主要意图                                                        |
| ---------------------------------- | --------------------------------------------------------------- |
| `/cars/tesla/model-y`              | Tesla Model Y wrap / wrap ideas / wrap colors / wrap visualizer |
| `/create/tesla-model-y`            | Tesla Model Y wrap designer / wrap editor                       |
| `/ai-wrap-generator/tesla-model-y` | Tesla Model Y AI wrap generator                                 |
| `/gallery/vehicle/tesla-model-y`   | Tesla Model Y wrap designs / wrap inspiration                   |
| `/wrap-colors/satin-black`         | Satin black car wrap / wrap color                               |

这样可以降低站内页面关键词互相竞争。

---

## 15.4 车型 Landing Page 页面结构

每个车型页面使用统一模板，但正文、Gallery、颜色、案例和 Metadata 必须根据车型动态生成，不做简单复制。

推荐结构：

```text
Hero
↓
Interactive 3D Preview
↓
Popular Wrap Colors
↓
Create Your Wrap
↓
AI Wrap Generator
↓
Featured Gallery Designs
↓
Popular Wrap Styles
↓
About Wrapping This Model
↓
FAQ
↓
Related Cars
```

### Hero

示例：

```text
H1:
Tesla Model Y Wrap Visualizer

Subtitle:
Preview wrap colors, create custom designs,
or generate a Tesla Model Y wrap with AI.

[Start Designing]
[Generate with AI]
```

Hero 必须直接出现车型名称，而不是所有车型共用：

> Design Your Car

### Interactive 3D Preview

车型页面可以嵌入轻量 Viewer。

默认：

- 可旋转；
- 可选择少量热门颜色；
- 不加载完整 UV Editor；
- CTA 进入 Create。

这样车型页本身就有工具价值，而不是纯内容页。

### Popular Wrap Colors

每辆车型展示：

- Satin Black；
- Nardo Grey；
- Matte Green；
- Metallic Blue；
- Pearl White；
- 其他动态热门颜色。

点击颜色：

```text
→ 当前 3D Viewer 切换
```

同时可以链接到对应 Wrap Color 页面。

### Create Your Wrap

展示 UV Editor 能力。

CTA：

```text
Design a {Model} Wrap
```

进入：

```text
/create/{vehicleSlug}
```

### AI Wrap Generator

展示 3–6 个针对该车型的 AI 示例。

CTA：

```text
Generate a {Model} Wrap with AI
```

进入：

```text
/ai-wrap-generator/{vehicleSlug}
```

### Featured Gallery Designs

直接读取该车型的公开 Gallery：

```text
/gallery/vehicle/{vehicleSlug}
```

展示：

- Latest；
- Popular；
- AI；
- Manual。

这样车型页内容会随着 UGC 增长自然更新。

### About Wrapping This Model

不写大段泛泛汽车介绍。

只写和用户搜索意图直接相关的内容，例如：

- 哪些车身区域最适合重点设计；
- 不同 Finish 在该车身曲面上的视觉差异；
- 该车型常见 Wrap 风格；
- 设计时需要注意的车灯 / 玻璃 / 饰条区域；
- 页面颜色为视觉模拟而不是实际膜样。

### FAQ

每辆车型可以使用相同问题框架，但答案必须结合车型。

例如：

```text
Can I preview a wrap on a Tesla Model Y?
Can I design individual panels?
Can I upload my own graphics?
Can AI generate a Model Y wrap?
Can I save and share my design?
Are the colors accurate to real wrap film?
```

---

## 15.5 车型页面不能依赖 Canvas 承载 SEO 内容

3D Viewer 最终虽然运行在 Canvas 中，但 Google 可索引的核心页面内容不能只存在 Canvas 内。

车型 Landing Page 必须服务端输出或静态输出：

- H1；
- Intro；
- 车型名称；
- Popular Colors；
- Gallery 卡片文字；
- CTA；
- FAQ；
- Related Cars；
- 图片 `alt`；
- Metadata。

即使 JavaScript / WebGL 没有运行，页面仍然应该能表达：

> 这是哪个车型、可以做什么、有哪些设计和入口。

---

## 15.6 车型 Alias / 海外名称 SEO

这是本项目特别值得利用的部分。

例如：

```text
BYD Seagull
BYD Dolphin Surf
BYD Dolphin Mini
```

底层可以共用同一个 3D Asset / Vehicle Family，但 SEO 不能粗暴地把所有关键词塞进一个页面。

策略：

### 情况 A：当地确实作为不同名称销售，并存在独立搜索意图

可以建立独立 Landing Page：

```text
/cars/byd/seagull
/cars/byd/dolphin-surf
/cars/byd/dolphin-mini
```

但页面必须包含独立的：

- Title；
- H1；
- 市场说明；
- Gallery；
- Internal Links；
- Metadata。

底层 3D 资产可以复用。

### 情况 B：只是同车型的弱别名，没有足够独立内容

不要批量制造重复页面。

将别名写入：

- Title / Description；
- 页面正文；
- Search suggestions；
- Alternate names；

并把流量集中到主 Landing Page。

### Geely 示例

中文：

```text
吉利星愿
```

海外：

```text
Geely EX2
```

可以根据 locale 使用不同主名称，但 Vehicle ID 与 3D Asset 保持一致。

---

## 15.7 Title / Description 模板

车型页：

```text
Title:
{Model} Wrap Visualizer & Custom Wrap Designer | {Brand}

Description:
Preview {Model} wrap colors in 3D, create your own custom wrap,
generate designs with AI, and explore wrap ideas from the community.
```

AI 页面：

```text
Title:
{Model} AI Wrap Generator – Create Custom Car Wrap Designs

Description:
Generate custom {Model} wrap concepts with AI,
preview them in 3D, and edit the design in the online wrap editor.
```

Create 页面：

```text
Title:
{Model} Wrap Designer – Create & Preview a Custom Wrap in 3D
```

Gallery Vehicle 页面：

```text
Title:
{Model} Wrap Ideas & Designs – Community Gallery
```

实际 Metadata 必须本地化，不能所有语言直接翻译同一套关键词。

---

## 15.8 图片 SEO

3D 产品非常适合 Google Images。

每个车型 Landing Page 至少预生成若干静态图片：

```text
{model}-wrap-visualizer.webp
{model}-satin-black-wrap.webp
{model}-matte-green-wrap.webp
{model}-ai-wrap-design.webp
```

要求：

- WebP / AVIF；
- 明确尺寸；
- 可抓取；
- 不是 Canvas 内临时图片；
- 有描述性 alt；
- Gallery Cover 使用独立 URL。

示例：

```text
alt="Tesla Model Y satin black wrap preview in 3D"
```

UGC Gallery 图片同样是重要的图片搜索资产。

---

## 15.9 Internal Linking

内部链接必须形成：

```text
Homepage
   ↓
Brand Page
   ↓
Model Landing Page
   ↓
Create / AI / Gallery / Color
```

同时反向链接：

```text
Gallery Design
→ Model Landing Page

AI Generator
→ Model Landing Page

Create Editor
→ Model Landing Page

Wrap Color
→ Supported Model Pages
```

车型页是中心 Hub。

首页的 Popular EVs 卡片：

**优先链接车型 Landing Page，而不是直接进入 Editor。**

车型页内部再通过强 CTA：

```text
Start Designing
Generate with AI
```

完成转化。

---

## 15.10 Brand Landing Pages

品牌页面也应该保留：

```text
/cars/tesla
/cars/byd
/cars/geely
/cars/mg
/cars/wuling
```

内容：

- Brand 下支持车型；
- Featured Wrap Designs；
- Popular Colors；
- Gallery；
- Create CTA。

但品牌页优先级低于具体车型页。

---

## 15.11 Gallery 与车型页 SEO 联动

每个 Gallery Design 都必须关联：

```text
vehicle_id
```

Design Detail 中显示：

```text
Designed for Tesla Model Y
```

并链接：

```text
/cars/tesla/model-y
```

车型 Landing Page 则动态展示：

```text
Featured Model Y Wrap Designs
```

形成：

```text
车型页
↔
UGC 作品页
```

Gallery 内容越多，车型页越丰富。

---

## 15.12 Index / Noindex 策略

### 应索引

- Home；
- Brand Pages；
- Model Landing Pages；
- AI Generator Landing Pages；
- Create Landing Pages；
- 高质量公开 Gallery Design；
- Gallery Vehicle Pages；
- 有内容的 Wrap Color Pages。

### 不索引

- `/projects/{id}/edit`；
- Account；
- Login；
- Credits；
- Checkout；
- Unlisted Designs；
- Drafts；
- 空 Gallery Filter；
- 内部搜索结果页；
- 带大量状态参数的 Viewer URL。

例如：

```text
?color=
?finish=
?camera=
```

这些状态 URL 不应该产生新的可索引页面。

使用 Canonical 指向车型主页面或对应 Landing Page。

---

## 15.13 Sitemap

建议拆分：

```text
/sitemap.xml
├─ sitemap-static.xml
├─ sitemap-cars.xml
├─ sitemap-gallery.xml
└─ sitemap-colors.xml
```

其中 `sitemap-cars.xml` 在 MVP 上线时必须包含所有独立车型 Landing Page。

Gallery Sitemap 只收录：

- Public；
- Published；
- 有封面；
- 有 Metadata；
- 非明显低质量内容。

---

## 15.14 结构化数据

优先使用与页面真实内容一致的结构化数据：

- `BreadcrumbList`；
- `WebPage`；
- 工具页可使用适合 Web App 的软件应用结构；
- Gallery 图片可提供 `ImageObject` 信息。

不要为了获得富摘要而把不是商品的车型页错误标记成 Product。

---

## 15.15 首批车型 SEO 页面矩阵

MVP 上线时至少形成：

| 车型                              | Model Landing | Create | AI Generator | Gallery |
| --------------------------------- | ------------- | ------ | ------------ | ------- |
| Tesla Model Y                     | ✅            | ✅     | ✅           | ✅      |
| Tesla Model 3                     | ✅            | ✅     | ✅           | ✅      |
| Geely Xingyuan / EX2              | ✅            | ✅     | ✅           | ✅      |
| Wuling Hongguang MINIEV           | ✅            | ✅     | ✅           | ✅      |
| BYD Seagull / Dolphin Surf / Mini | ✅            | ✅     | ✅           | ✅      |
| MG4 EV                            | ✅            | ✅     | ✅           | ✅      |
| BYD Dolphin                       | ✅            | ✅     | ✅           | ✅      |

也就是说：

**每新增一个车型，不只是增加一个 GLB。**

标准交付应该变成：

```text
3D Asset
+
Wrap UV
+
Model Landing Page
+
Create Entry
+
AI Entry
+
Gallery Vehicle Page
+
Metadata
+
Static Preview Images
```

这应该成为后续新增车型的固定 SOP。

---

# 16. 首页结构

下面这版可以直接作为首页内容结构。

## 1. 顶部导航

```text
Logo

Home
Gallery
Cars
Blog
AI Generator

Language
Sign In
```

其中 **AI Generator** 使用主按钮样式。

---

## 2. Hero

Eyebrow：

**AI-Powered Vehicle Wrap Design Platform**

H1：

# Vehicle Wrap Designer

副标题：

**Create custom vehicle wraps, generate designs with AI, and preview every detail instantly on realistic 3D vehicle models.**

CTA：

**Start Designing**  
**Explore Gallery**

文字下方直接展示大尺寸 **3D Vehicle Viewer**：

```text
                3D Vehicle

[ Model Y ] [ Model 3 ] [ BYD Seagull ]
[ MG4 EV ] [ Geely EX2 ] [ Wuling MINIEV ]

Gloss   Satin   Matte   Metallic   Pearl
```

支持：

- 旋转 / Zoom
- 车型切换
- Wrap 材质切换
- Panel Hover 淡蓝高亮

---

## 3. Gallery

标题：

# Explore What Others Are Creating

副标题：

**Discover vehicle wrap designs created by our community and remix your favorites.**

筛选：

```text
Trending
Latest
Tesla
BYD
Geely
MG
Wuling
AI Generated
```

作品卡：

```text
Cover
Design Name
Vehicle
Creator
Remix
```

CTA：

**Explore All Designs**

---

## 4. Create Your Wrap

标题：

# Design Your Vehicle Wrap

副标题：

**Create a custom wrap directly in your browser. No Photoshop or professional design software required.**

展示 Editor：

```text
Upload
Text
Shapes
Stickers
AI
Layers

        UV Editor
             +
        Live 3D Preview
```

核心文案：

**Every change appears instantly on your 3D vehicle.**

CTA：

**Open Wrap Editor**

---

## 5. AI Wrap Generator

标题：

# Generate Vehicle Wraps With AI

副标题：

**Describe your idea and turn it into a custom wrap design in seconds.**

Prompt 示例：

> Midnight purple cyberpunk wrap with subtle neon blue lines.

流程：

```text
Describe
→ Generate
→ Preview in 3D
→ Edit
→ Publish
```

展示 4–6 个 AI Wrap 示例。

CTA：

**Generate My Wrap**

---

## 6. Realistic 3D Preview

标题：

# See It Before You Wrap It

副标题：

**Preview your design on a realistic 3D model before making it real.**

展示同一辆车：

```text
Gloss
Satin
Matte
Metallic
Pearl
Color Shift
```

卖点：

**360° Preview · Panel Selection · Realistic Reflections · Live Wrap Updates**

---

## 7. How It Works

标题：

# Create Your Wrap in 3 Steps

**01 — Choose Your Vehicle**  
Select the exact EV model you want to customize.

**02 — Create or Generate**  
Design manually or start with AI.

**03 — Preview & Share**  
See it in 3D, publish it to the Gallery, or share it anywhere.

---

## 8. Why Vehicle Wrap Creator

标题：

# Everything You Need to Design a Vehicle Wrap

六个卖点：

**Real Vehicle Models**  
Accurate 3D models built for wrap design.

**UV-Based Editing**  
Design graphics directly on the vehicle wrap layout.

**AI-Powered Creation**  
Turn text ideas into unique wrap concepts.

**Live 3D Preview**  
See every edit instantly from any angle.

**No Software Required**  
Everything works directly in your browser.

**Create & Remix**  
Publish your designs and remix community creations.

Tesla 页面可以额外强调：

**Compatible with Tesla Paint Shop UV Templates**

---

## 9. Popular Vehicle Wrap Designers

这一块主要服务 SEO。

标题：

# Design a Wrap for Your Vehicle

卡片：

```text
Tesla Model Y Wrap Designer
Tesla Model 3 Wrap Designer
BYD Seagull Wrap Designer
BYD Dolphin Wrap Designer
Geely EX2 Wrap Designer
MG4 EV Wrap Designer
Wuling MINIEV Wrap Designer
```

每张卡进入独立车型 Landing Page：

```text
/cars/tesla/model-y
/cars/tesla/model-3
/cars/byd/seagull
...
```

---

## 10. FAQ

What is a UV template?
....

---

## 11. Community CTA

标题：

# Create It. Preview It in 3D. Share It.

副标题：

**Turn your next vehicle wrap idea into something you can actually see.**

CTA：

**Start Designing**

**Generate With AI**

---

## 12. Footer

```text
Product
AI Generator
Gallery
Cars

Popular Vehicles
Tesla Model Y
Tesla Model 3
BYD Seagull
BYD Dolphin
MG4 EV
Geely EX2

Resources
Wrap Guides
Design Ideas
Blog
Help Center

Company
About
Contact

Legal
Terms
Privacy
Community Guidelines

Language
English
中文
```

# 17. 商业化

## Phase 1 — MVP

免费：

- 3D Viewer；
- 基础 UV Editor；
- Gallery 浏览；
- Publish；
- Remix；
- 基础 Screenshot。

AI 从 MVP 开始使用 Credits。

可以：

- 注册赠送少量 AI Credits；
- AI Generation 消耗 Credits；
- Credits 不足后购买 Pack。

具体价格根据实际 AI 成本确定。

## Phase 2

增加：

- HD Export；
- No Watermark；
- Premium Templates；
- Premium Stickers；
- Premium Backgrounds；
- 更高质量 AI Model。

## Phase 3

UGC 和流量稳定后：

- Film Sample Affiliate；
- Wrap Film SKU；
- Material Affiliate。

## Phase 4

最后考虑：

- Find Installer；
- Installer Lead；
- Quote Request；
- B2B；
- White Label。

---

# 18. 核心指标

North Star Metric：

## **Completed Creations / Month**

定义：

用户通过：

```text
UV Editor
或
AI Generator
```

完成设计，并发生至少一个动作：

```text
Save
Export
Publish
```

## 18.1 创作漏斗

```text
create_view
vehicle_selected
editor_started
asset_added
ai_generate_started
ai_generate_succeeded
design_previewed
project_saved
design_published
design_exported
```

## 18.2 Gallery 漏斗

```text
gallery_view
design_view
design_share
design_remix_click
remix_project_created
```

## 18.3 商业漏斗

```text
credit_balance_empty
pricing_view
credit_pack_click
checkout_started
purchase_success
```

---

# 19. MVP 成功指标

90 天重点观察：

## 产品

- Viewer / Create Start：> 30%
- Editor 有效编辑：> 40%
- AI Generate 成功后 Preview：> 70%
- Project Save：> 15% of creator sessions
- Publish / Export / Share：> 8% of creator sessions
- Gallery → Design Detail：> 20%
- Design Detail → Remix：目标 5–10%

以上是产品验证目标，不是行业基准。

## Growth

重点判断：

- Gallery 是否持续产生新作品；
- UGC 是否带来新的自然访问；
- Gallery 是否进入 Google Images；
- 社交分享是否带回访问；
- Remix 是否产生二次创作；
- 哪些车型最容易形成 UGC。

## Monetization

MVP 最重要的付费验证：

**AI Credits 是否有人购买。**

---

# 20. MVP 开发计划

由于 UV Editor、AI、Gallery 已进入 P0，MVP 不再按原来的 6 周估算。

目标：

**8–10 周。**

前提：

- 一名熟练独立开发者；
- 首批 3D 资产按计划获得；
- AI 使用成熟第三方 API；
- 不开发复杂社区系统。

## Week 1

- Next.js；
- i18n；
- Auth；
- Database；
- Model Y Viewer；
- HDRI；
- Material；
- Panel Selection。

目标：

**Model Y 达到目标 3D 质感。**

## Week 2

- Material Engine；
- Panel Highlight；
- CanvasTexture；
- UV Template；
- Konva Editor Prototype。

目标：

**2D Canvas 添加图片后可以同步显示到 Model Y。**

## Week 3

UV Editor P0：

- Upload；
- Text；
- Shapes；
- Stickers；
- Transformer；
- Layers；
- Undo / Redo；
- Save JSON；
- Reopen Project。

## Week 4

AI Generator：

- Prompt；
- Generation API；
- Async State；
- Result；
- Apply to Project；
- Open in Editor；
- Credits。

## Week 5

Project / Account：

- My Projects；
- Save；
- Duplicate；
- Delete；
- Cover；
- Publish。

## Week 6

Gallery：

- List；
- Latest；
- Popular；
- Vehicle filter；
- Detail；
- Author；
- Share；
- Remix；
- Report。

## Week 7–8

车型资产：

- Model Y；
- Model 3；
- Xingyuan / EX2；
- Hongguang MINIEV；
- BYD Seagull；
- MG4；
- BYD Dolphin。

每辆车：

```text
cleanup
panel segmentation
wrap UV
normal fixing
material separation
poly reduction
GLB export
compression
```

## Week 9

- Mobile Editor；
- 7 个车型独立 SEO Landing Page；
- Brand Landing Page；
- Gallery SEO；
- Model × Gallery 内链；
- 每车型静态 Preview Images；
- Multi-language；
- Sitemap；
- Canonical / hreflang；
- Metadata；
- Analytics；
- Credits / Payment。

## Week 10

- Performance；
- Safari；
- Android；
- iPhone；
- 内容审核；
- Error handling；
- Launch QA。

如果车型资产提前完成，可以压缩至约 8 周。

---

# 21. 第一阶段预算

| 项目               |       预算 |
| ------------------ | ---------: |
| 3D models          | $500–1,500 |
| 资产修改 / UV 外包 | $300–1,500 |
| HDRI / textures    |     $0–200 |
| AI API 测试        |   $100–500 |
| Hosting / CDN / DB | $30–150/月 |
| Domain / misc      |    $50–150 |
| Marketing          |     $0–300 |

MVP 建议：

**约 $1,000–4,000。**

AI 成本必须通过 Credits 或免费额度控制。

---

# 22. 最大产品风险

## Risk 1：3D 模型授权

必须确认商业 Web Application 使用许可，并避免把可直接复用的原始资产裸露为公开下载。

## Risk 2：UV 资产制作成本

Viewer 能用的模型，不代表适合 UV Editor。

每辆车必须确认：

- Wrap UV；
- Panel；
- 左右不镜像；
- 正确法线；
- 统一资产规范。

## Risk 3：AI 与 UV 不匹配

AI 很容易生成“好看的汽车图”，但不代表能直接成为可编辑 Wrap Texture。

MVP 正确目标：

**AI 产生设计素材 / Pattern → 放入 UV Editor → 用户调整 → 3D Preview。**

## Risk 4：UGC 内容质量

必须避免 Gallery 充斥：

- 重复；
- 空白；
- 低质量；
- 垃圾 AI 内容。

需要：

- Publish 门槛；
- Cover；
- Metadata；
- Report；
- 基础审核；
- 低质量内容不进 sitemap。

## Risk 5：车型与 UV 版本

历史 Project 必须绑定：

```text
vehicle_id
asset_version
uv_version
```

UV 更新不能破坏历史项目。

---

# 23. Roadmap

## Phase 1 — Creator MVP

0–2.5 月：

- 7 个车型；
- Real-time 3D；
- 40–60 colors；
- UV Editor；
- AI Generator；
- Account；
- Project Save；
- Gallery；
- Publish；
- Remix；
- Share；
- English + Chinese；
- AI Credits；
- SEO。

## Phase 2 — Growth

2.5–5 月：

- Spanish；
- Portuguese；
- German；
- French；
- 更多车型；
- 更多 Template；
- 更多 Sticker；
- 100+ colors；
- Gallery 搜索；
- Tags；
- Trending；
- Google Images SEO；
- Pinterest / TikTok 内容；
- 更强 Remix。

## Phase 3 — Creator Monetization

4–7 月：

- HD Export；
- No Watermark；
- Premium Templates；
- Premium Assets；
- 高质量 AI；
- AI Variations；
- AI Inpainting；
- AI Refine；
- Subscription / Paid Credits。

## Phase 4 — Commerce

稳定流量后：

- Film SKU；
- Sample Affiliate；
- Wrap Material Affiliate；
- Find Installer；
- Quote Request；
- Installer Lead。

## Phase 5 — B2B

B2C 有稳定流量和内容后再评估：

- Wrap Shop Dashboard；
- White Label；
- 商家 Gallery；
- Customer Preview Link；
- B2B Subscription。

---

# 24. 最终切入策略

产品不再定义为纯：

> Car Wrap Visualizer

也不只定义为：

> AI Car Wrap Generator

更合适的方向：

# EV Wrap Creator

核心承诺：

> **Create it. Preview it in 3D. Share it.**

核心组成：

```text
High-quality EV Models
+
UV Editor
+
AI Generation
+
Gallery
+
Remix
```

其中：

- 3D 提供结果可信度；
- UV Editor 提供控制力；
- AI 提供低门槛；
- Gallery 提供内容；
- Remix 提供增长循环。

---

# 25. 第一版真正需要做好的四件事

## 第一：3D 质感

车辆必须达到高质量 Web Configurator 水平。

## 第二：UV Editor

不追求专业，但必须：

**简单、快、实时反馈。**

产品文案应表达：

> Design your car

而不是：

> Edit UV Map

## 第三：AI → Editor 的衔接

AI 生成后必须能够：

**Open in Editor**

AI 不是独立玩具，而是创作工作流的一部分。

## 第四：Gallery / Remix

Gallery 不能只是图片墙。

必须形成：

```text
Design
→ View
→ Remix
→ Edit
→ Publish
```

---

# 26. 开发决策摘要

产品第一版：

**7 个 3D 车型 + 40–60 材质 + 高质量 3D Viewer + UV Editor + AI Wrap Generator + Account + Project Save + Gallery + Publish + Remix + Share + English/Chinese。**

第一阶段延后：

- Affiliate；
- Installer；
- Quote；
- B2B；
- White Label；
- 复杂社区。

上线以后首先验证：

```text
Traffic
↓
Create / Gallery
↓
UV Edit / AI Generate
↓
3D Preview
↓
Save / Publish / Share
↓
Gallery Discovery
↓
Remix
```

AI Credits 同时验证第一批付费。

---

# 27. MVP 验收标准

## 3D

- 7 个车型可正常加载；
- 主要 Panel 可 Hover / Select；
- Panel 可单独换色；
- Wrap Texture 实时映射；
- Gloss / Matte / Satin / Metallic / Pearl / Color Shift；
- HDRI / Reflection / Glass / Shadow 达到统一质量；
- Mobile 3D 正常。

## UV Editor

- 每辆车型有可用 Wrap UV；
- Upload Image；
- Text；
- Shape；
- Sticker；
- Move / Scale / Rotate；
- Layers；
- Undo / Redo；
- Save；
- Reopen；
- 3D 实时 Preview。

## AI

- Prompt；
- Generate；
- Result；
- Apply；
- Open in Editor；
- Regenerate；
- Credits；
- Failure rollback。

## Account / Project

- Login；
- My Projects；
- Save；
- Duplicate；
- Delete；
- Reopen。

## Gallery

- Publish；
- Gallery List；
- Design Detail；
- Vehicle filter；
- Author；
- Share；
- Remix；
- Report；
- Unpublish。

## SEO

- 7 个首发车型全部具有独立、可索引的 Model Landing Page；
- 每个车型页包含独立 H1 / Title / Description / 内容模块；
- 每个车型页提供 3D Preview、Popular Colors、Gallery、Create、AI CTA；
- Cars / Brand pages；
- Create vehicle landing pages；
- AI Generator vehicle pages；
- Gallery Vehicle pages；
- Gallery public design pages；
- Model Landing Page ↔ Gallery Design 双向内链；
- 每车型存在可抓取的静态 Preview Images；
- sitemap-cars / sitemap-gallery 等 Sitemap 正常；
- canonical；
- hreflang；
- Public Design metadata；
- 状态参数 URL 不产生重复索引；
- Unlisted / Draft / 低质量内容不进入索引。

## Analytics

完整追踪：

```text
Visit
→ Create
→ Edit / AI
→ Preview
→ Save
→ Publish
→ Share
→ Gallery
→ Remix
→ AI Purchase
```

## Legal / Safety

- 3D 模型商用授权；
- UGC Terms；
- AI 内容规则；
- Report 流程；
- 颜色效果免责声明。

满足以上条件后：

**立即上线，不等待 B2B、Affiliate、Installer、完整社区和更多车型。**
