# 韩语、德语、意大利语本地化关键词

日期：2026-10-11。先确定页面搜索意图，再据此改写标题、描述、H1、导语和正文；不是逐字替换英文。代码保持现有路径，在前面增加 `/ko`、`/de`、`/it`。

## 选词依据与限制

以本地语言检索结果和当地品牌/服务商的实际用词作为定性依据。没有接入 Keyword Planner、Search Console 或付费关键词数据库，因此不声称下列词搜索量最高、竞争最低或保证排名。AI 长尾词属于产品意图推导，需上线后用真实查询与转化数据复核。

- 韩语：3M 韩国使用「자동차 랩핑」「랩핑 필름」，而 PPF 对应保护膜/施工需求。本产品主推设计与预览，用「디자인」「온라인」「3D 미리보기」限定，避免把设计工具写成实体施工或保护膜服务。
  - https://www.3m.co.kr/3M/ko_KR/car-personalization-kr/products/wrap-film/
  - https://www.3m.co.kr/3M/ko_KR/car-personalization-kr/products/coverage-options/
- 德语：当地服务商使用 Autofolierung、online gestalten、Design Konfigurator；宽泛 Folierung 结果也包括施工价格和 PPF，首页用 selbst gestalten 聚焦 DIY 设计，车型页搭配 3D-Vorschau。
  - https://www.druckerei-wiedmann.de/leistungen/carwrapping
  - https://signal-design.de/auto-folieren-konfigurator/
  - https://tripleschicht.de/news/neu-autofolierung-tesla-model-3/
- 意大利语：当地页面自然使用 car wrapping、configuratore online，Tesla 数字设计工具使用 configuratore wrapping。采用 wrapping auto / configuratore，避免机械翻译成 avvolgimento。
  - https://www.artestick.it/car-wrapping-e-cambio-colore/
  - https://www.twrapdesign.it/
  - https://www.wegroups.eu/configuratore-3d-auto

## 每页主关键词

| 页面                              | 韩语                      | 德语                             | 意大利语                     | 用户意图                                 |
| --------------------------------- | ------------------------- | -------------------------------- | ---------------------------- | ---------------------------------------- |
| `/`                               | 자동차 랩핑 디자인        | Autofolierung selbst gestalten   | configuratore wrapping auto  | 在线设计、免费编辑与 3D 预览             |
| `/tesla-wrap`                     | 테슬라 랩핑 디자인        | Tesla Folierung gestalten        | wrapping Tesla               | Tesla 车型选择与风格探索                 |
| `/tesla-model-y-wrap`             | 테슬라 모델 Y 랩핑        | Tesla Model Y Folierung          | wrapping Tesla Model Y       | Model Y 各版本配色、构图与预览           |
| `/tesla-model-3-wrap`             | 테슬라 모델 3 랩핑        | Tesla Model 3 Folierung          | wrapping Tesla Model 3       | Model 3 / 2024 版本设计与预览            |
| `/ai-car-wrap-generator`          | AI 자동차 랩핑 디자인     | KI-Folierungsdesign              | generatore wrapping auto IA  | 描述或参考图生成设计，不是车辆照片生成器 |
| `/gallery`                        | 자동차 랩핑 디자인 모음   | Autofolierung Ideen              | idee wrapping auto           | 按车型找社区灵感、查看和下载作品         |
| `/pricing`                        | AI 랩핑 디자인 크레딧     | Credits für KI-Folierungsdesign  | crediti per wrapping auto IA | 了解 AI 生成额度和一次性购买价格         |
| `/blog`                           | 자동차 랩핑 디자인 가이드 | Anleitungen zum Folierungsdesign | guide al wrapping auto       | 学习模板选择与设计方法                   |
| `/blog/tesla-wrap-complete-guide` | 테슬라 랩핑 만들기        | Tesla Wrap erstellen             | creare un wrapping Tesla     | 创建、导出和导入车机数字图案             |

辅助词自然分配到导语、章节与 FAQ：韩语「랩핑 시뮬레이션」「테슬라 커스텀 랩핑」，德语「Folierungs-Konfigurator」「Fahrzeugfolierung」「3D-Vorschau」，意大利语「anteprima 3D」「livrea personalizzata」「progettare wrapping online」。不以机械重复或关键词密度为目标。

## 文案约束

- 韩语使用自然敬语；德语使用一致的 du；意大利语使用 tu。品牌、车型与文件格式保留标准名称。
- 免费指手动编辑器与预览。AI 每张图片 10 积分，保留现有付费/公开规则。
- AI 结果是合并图片，内部文字、标志和图案不能独立编辑。手动添加的文字、图片和形状可以作为独立图层调整。
- 数字预览不等于实体印刷或裁切文件，实体制作仍需专业核对。
- 价格仍为美元，不暗示自动换算成本币。日期使用当前语言格式。
- `admin.json` 按用户要求不翻译；缺失的后台消息使用 Paraglide 英文回退。
- 用户发布的设计标题、描述及提示词保持作者原文，不自动改写用户内容。

## 实现与验证

- 注册 `ko`、`de`、`it`，提供各语言 1,023 条前台消息，覆盖公共界面、落地页、编辑器、AI 生成器和用户中心；键集合与插值占位符与英文一致。
- 三个车型落地页的长文、隐私政策、服务条款及 Tesla 完整指南均有独立本地化版本。保持产品能力、计费规则、模型披露和链接含义。
- 本地生产构建、TypeScript 检查通过。生成的 Paraglide 消息确认后台缺失语言回退到英文。
- 服务端检查三种新语言的 33 个公开页面：状态 200、正确 `lang`、单个 H1、自指 canonical、五语言及 `x-default` hreflang。
- SEO 回归检查通过：55 条 sitemap URL、各语言画廊链接、筛选页 noindex、私有页面 noindex、文章结构化数据及指南文本输出。
- 隔离接口测试通过：五种语言的请求与本地化错误、Waffo 支持范围内的 locale 回退、明确 block 不创建任务或冻结积分、其他结果继续生成。测试使用临时数据库和模拟 HTTP，不调用付费供应商。
- 浏览器检查发现并修复德语首页内容挤宽和 AI 页长单词溢出；三种语言的首页和 AI 页在 390、1024、1512 像素宽度下均无页面横向溢出。
- 桌面及手机菜单语言切换通过，保留当前页面路径与查询参数；API 路径不增加语言前缀。
- 验证限制：本地浏览器访问远程 3D 模型出现资源请求失败，部分车型预览未完整加载；不据此宣称远程 3D 资源、真实生成或生产环境验证通过。未部署。
