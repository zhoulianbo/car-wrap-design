# Car Wrap Design 数据库字典

本文档记录产品新增的业务表。认证、支付、订阅、积分、权限、通用 AI 任务等模板表继续沿用原有设计。

三种方言定义位于 `src/config/db/schema.{sqlite,postgres,mysql}.ts`；`schema.ts` 是生成的本地工作副本。SQLite 时间使用毫秒时间戳，PostgreSQL/MySQL 使用 timestamp。`deleted_at` 表示软删除。

## 数据边界

不再有“项目”容器。车衣、上传附件、AI 任务和画廊作品直接归属用户：

| 数据            | 所属用户   | 保存内容                                   | 何时写入           |
| --------------- | ---------- | ------------------------------------------ | ------------------ |
| `user_wrap`     | `user_id`  | UV 纹理、编辑快照、材质、AI 来源、审核状态 | 手动保存或 AI 成功 |
| `user_asset`    | `owner_id` | 用户上传附件的存储元数据                   | 用户上传成功       |
| `ai_generation` | `user_id`  | 生成参数、计费状态、输出图片引用           | 提交生成及任务完成 |
| `design`        | `owner_id` | 已审核纹理、封面、名称、材质、社区统计     | 审核通过或后台添加 |

车衣不是附件或 AI 任务的父实体；删除车衣保留附件和 AI 任务，但会同步移除其关联画廊作品。`source_wrap_id` 关联发布来源；`source_design_id` 记录二次创作来源，已保存的二次创作拥有独立底图。

车辆、UV 模板和材质参数在 `src/lib/vehicle-catalog.ts` 中随发版维护；数据库仅保留稳定 `vehicle_slug`、`template_version` 和 `finish`。

## `user` — 本项目扩展字段

| 字段      | 可空 | 默认值    | 作用                                                                                                                                            |
| --------- | ---- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_paid` | 否   | false / 0 | 是否已成功付费；一次性积分包（含体验包）支付成功后置为 true，不随积分耗尽或订阅到期清除。用于 50 MiB 素材配额与体验付费墙资格。客户端不能写入。 |

迁移 `scripts/migrations/20261010-user-paid.sql` 为 SQLite / D1 增加字段，并从金额大于零的成功订单回填。三种方言 schema 均已定义此字段；线上迁移需在对应环境备份、审阅后执行。

体验包行为只保存在浏览器 localStorage：`wrap-credit-offer:v1:<userId>` 按账号隔离，记录普通付费墙关闭次数、普通包购买点击次数、首次展示后两小时的绝对截止时间和本次关闭标记。刷新不重置时间；关闭体验包后保持隐藏，但未付费用户在有效期内再次关闭普通付费墙时可重新展示，沿用原截止时间；过期后不再展示。localStorage 不可用时不展示体验优惠。服务器仍根据数据库 `is_paid` 限制体验包购买，金额与积分来自价格目录；客户端时间与次数不构成跨设备的优惠资格凭证。

## `user_wrap` — 用户车衣

最终图片用于展示、3D 贴图与导出；编辑快照用于重新打开后调整文字、颜色、形状和图层。只存图片会丢失继续编辑能力，因此两者均保留。快照不保存撤销/重做历史，也不将每个元素拆成数据库记录。

画布快照的 `panelColors` 按 UV 模板白色连通区域序号保存分块底色，位于可编辑素材下方；`generatedName` 保存编辑器内 AI 生成的简短名称。`user_wrap.name` 是作品名称的持久化来源：直接 AI 创建时取拉丁文字提示词前两个单词；其他文字最多 16 个长度单位（ASCII 计 1，其他字素计 2，一个中文计 2，不截断 emoji）。手动创建默认使用车型名称加 `Wrap`。后台审核可改名，并同步社区标题；后续保存画布不会覆盖名称。历史 `generatedName` 仅为兼容旧编辑快照保留。

| 字段                | 可空 | 默认值               | 作用                                                   |
| ------------------- | ---- | -------------------- | ------------------------------------------------------ |
| `id`                | 否   | —                    | 主键                                                   |
| `user_id`           | 否   | —                    | 所有者，关联 user，用户删除时级联删除                  |
| `name`              | 否   | 空字符串（迁移兼容） | 作品名称；新作品写入默认名称，后台审核可修改           |
| `vehicle_slug`      | 否   | —                    | 代码车型标识                                           |
| `template_version`  | 否   | —                    | 使用的 UV 模板版本                                     |
| `canvas_json`       | 否   | `{}`，MySQL 无默认值 | 当前完整编辑快照，包含元素属性及图片 URL；不嵌入二进制 |
| `texture_key`       | 是   | null                 | 合成 UV 纹理对象键                                     |
| `texture_url`       | 是   | null                 | 合成纹理 URL                                           |
| `finish`            | 否   | gloss                | gloss / satin / matte / metallic / pearlescent         |
| `source_design_id`  | 是   | null                 | 二次创作来源作品 ID                                    |
| `idempotency_key`   | 是   | null                 | 首次保存幂等键，唯一                                   |
| `uses_ai`           | 否   | false                | 是否包含 AI 生成内容，保存后不因普通编辑丢失           |
| `open_to_gallery`   | 否   | true                 | 是否允许提交社区；关闭时不进入待审核                   |
| `moderation_status` | 否   | pending              | 当前用户版本的 pending / approved / rejected / private |
| `generation_id`     | 是   | null                 | 对应成功的 AI 任务 ID，唯一，回调重试不重复创建车衣    |
| `version`           | 否   | 1                    | 内部并发更新检查，界面不显示                           |
| `status`            | 否   | draft                | 新保存为 saved，迁移保留旧值，删除为 deleted           |
| `created_at`        | 否   | 当前时间             | 创建时间                                               |
| `updated_at`        | 否   | 当前时间             | 最后保存时间                                           |
| `deleted_at`        | 是   | null                 | 软删除时间                                             |

索引：`(user_id,status)`、`vehicle_slug`；幂等键唯一。图片字段可空是为兼容旧草稿；新保存只提交纹理和完整编辑快照。没有旧合成纹理的草稿保留原快照，重新保存时生成图片。

## `user_asset` — 用户上传附件

只记录用户上传的文件。同一用户的不同车衣可复用附件，不存在 `project_id` 或 `wrap_id`。

| 字段           | 可空 | 默认值   | 作用                                        |
| -------------- | ---- | -------- | ------------------------------------------- |
| `id`           | 否   | —        | 主键                                        |
| `owner_id`     | 否   | —        | 上传用户，关联 user，用户删除时级联删除     |
| `kind`         | 否   | —        | 固定 upload，不接收封面、生成结果或导出类型 |
| `source`       | 否   | —        | 固定 upload                                 |
| `storage_key`  | 否   | —        | 上传文件对象键                              |
| `public_url`   | 是   | null     | 图片读取 URL                                |
| `mime_type`    | 否   | —        | MIME，当前上传接口接受客户端处理后的 WebP   |
| `byte_size`    | 否   | —        | 实际文件字节数，用于配额计算                |
| `width`        | 是   | null     | 图片宽度                                    |
| `height`       | 是   | null     | 图片高度                                    |
| `content_hash` | 否   | —        | 内容哈希                                    |
| `visibility`   | 否   | private  | 业务可见性；不等价于对象存储访问控制        |
| `created_at`   | 否   | 当前时间 | 上传时间                                    |
| `deleted_at`   | 是   | null     | 软删除时间                                  |

索引：`(owner_id,storage_key)`、`(owner_id,deleted_at)`。免费用户累计 5 MiB，付费用户累计 50 MiB，仅计算未删除的附件。AI 参考图目前也作为可复用的用户上传附件保存并计入配额；不实现无期限免费的临时上传通道。

## `ai_generation` — 用户 AI 生成任务

提交时冻结积分；生成结果存储成功后，在同一事务中结算积分并创建 `user_wrap`。生成任务保留服务商和计费信息，不作为用户作品库的数据源。打开生成结果继续编辑时复用该用户车衣，不重复创建。

生成任务的 `ai_task.options` 保存 `openToGallery` 和 `preferredColors`。未付费用户沿用公开规则；付费用户可关闭公开。AI 成功时创建 `uses_ai=true` 的用户车衣，公开者进入 pending，私有者为 private。此时不生成社区封面、不创建 `design`。管理员确认名称后，客户端用共享渲染方法生成 800×800 透明封面（包含车底阴影，四边至少 20px）；服务端校验审核版本未改变后，复制车衣图片并创建或替换 `design`。

| 字段                     | 可空 | 默认值             | 作用                                     |
| ------------------------ | ---- | ------------------ | ---------------------------------------- |
| `id`                     | 否   | —                  | 主键                                     |
| `ai_task_id`             | 否   | —                  | 关联通用 ai_task，唯一                   |
| `user_id`                | 否   | —                  | 发起用户，关联 user，用户删除时级联删除  |
| `vehicle_slug`           | 否   | —                  | 本次生成的车型                           |
| `template_version`       | 否   | —                  | 本次生成的模板版本                       |
| `mode`                   | 否   | —                  | text-to-image / image-to-image           |
| `provider`               | 否   | —                  | 实际服务商                               |
| `model`                  | 否   | —                  | 实际模型                                 |
| `prompt`                 | 否   | —                  | 提示词                                   |
| `style`                  | 是   | null               | 风格                                     |
| `base_color`             | 是   | null               | 可选基础颜色                             |
| `input_assets_json`      | 否   | []，MySQL 无默认值 | 同一用户的上传附件 ID 数组               |
| `provider_prediction_id` | 是   | null               | 服务商任务 ID，唯一                      |
| `idempotency_key`        | 否   | —                  | 请求幂等键，唯一                         |
| `cost_credits`           | 否   | —                  | 扣除积分                                 |
| `status`                 | 否   | queued             | queued / processing / succeeded / failed |
| `output_key`             | 是   | null               | 成功结果对象键                           |
| `output_url`             | 是   | null               | 成功结果图片 URL                         |
| `completion_claim`       | 是   | null               | 回调/轮询竞争时的完成处理令牌            |
| `completion_claimed_at`  | 是   | null               | 完成处理起始时间，5 分钟后允许重试       |
| `error_summary`          | 是   | null               | 失败摘要                                 |
| `refund_status`          | 否   | not-required       | 退款状态                                 |
| `last_polled_at`         | 是   | null               | 上次轮询时间                             |
| `created_at`             | 否   | 当前时间           | 创建时间                                 |
| `updated_at`             | 否   | 当前时间           | 更新时间                                 |

索引：`(user_id,status)`；通用任务 ID、服务商任务 ID、幂等键各自唯一。输出不写入 user_asset，不占附件配额。

## `design` — 画廊发布快照

只保存已审核的社区作品。用户保存 V2 后，V1 继续公开；V2 审核通过后更新同一 design 的图片、封面、标题、材质和 source_version，保留 ID、slug 和社区统计。删除用户车衣会同步软删除关联 design。快照只含合成图片，不公开私有编辑图层。

| 字段                | 可空 | 默认值   | 作用                                                                                |
| ------------------- | ---- | -------- | ----------------------------------------------------------------------------------- |
| `id`                | 否   | —        | 主键                                                                                |
| `owner_id`          | 否   | —        | 作者，关联 user                                                                     |
| `source_wrap_id`    | 是   | null     | 来源用户车衣；业务删除时同步移除社区作品                                            |
| `source_version`    | 否   | 1        | 已审核的用户车衣版本，拒绝过期审核结果                                              |
| `vehicle_slug`      | 否   | —        | 发布车型                                                                            |
| `template_version`  | 否   | legacy   | 发布模板版本                                                                        |
| `slug`              | 否   | —        | 公开路径，唯一                                                                      |
| `title`             | 否   | —        | 标题                                                                                |
| `description`       | 是   | null     | 描述                                                                                |
| `snapshot_json`     | 否   | —        | 发布快照；新记录仅含合成纹理，旧记录迁移保留，但不由公开 API 返回                   |
| `texture_key`       | 是   | null     | 固定纹理对象键                                                                      |
| `texture_url`       | 是   | null     | 固定纹理 URL                                                                        |
| `cover_key`         | 是   | null     | 固定封面对象键                                                                      |
| `cover_url`         | 是   | null     | 800×800 透明底 3D 封面 URL，车辆等比居中且四边至少 20px 留白                        |
| `finish`            | 否   | gloss    | 发布材质                                                                            |
| `visibility`        | 否   | public   | public / unlisted / private                                                         |
| `show_in_hero`      | 否   | false    | 是否在首页 Hero 展示；仅公开、已通过审核且含贴图与封面的作品可见，按车型最多 8 条。 |
| `uses_ai`           | 否   | false    | 是否含 AI 内容                                                                      |
| `public_prompt`     | 否   | false    | AI 作品审核通过且有原始提示词时自动公开                                             |
| `prompt`            | 是   | null     | 审核时保存关联成功 AI 任务的原始提示词快照                                          |
| `moderation_status` | 否   | pending  | pending / approved / rejected / reported / hidden                                   |
| `publish_key`       | 否   | —        | 发布幂等键，唯一                                                                    |
| `view_count`        | 否   | 0        | 查看次数                                                                            |
| `download_count`    | 否   | 0        | 公开且审核通过的作品，成功取得下载图片后累计；悬停预览不计数，历史下载不回填。      |
| `remix_count`       | 否   | 0        | 二次创作次数                                                                        |
| `share_count`       | 否   | 0        | 分享次数                                                                            |
| `published_at`      | 否   | 当前时间 | 发布时间                                                                            |
| `updated_at`        | 否   | 当前时间 | 更新时间                                                                            |
| `deleted_at`        | 是   | null     | 软删除                                                                              |

索引：公开审核列表、作者列表、车型列表；slug 和 publish_key 唯一。新发布要求已有持久化纹理。

## 保存与存储约定

- 编辑中的操作和撤销历史只在浏览器内存中变化；切换编辑/3D tab 保留当前画布。
- `POST /api/wraps` 接受 data、texture 的 multipart 表单。保存完整图层快照，成功后重新进入审核；不生成或上传封面。审核通过才生成社区封面和独立社区纹理。
- 图片每次使用新对象键。替换发布内容提交成功后，删除无其他引用的旧封面、旧纹理；仍被用户编辑图层、AI 原图或其他记录引用的对象保留。存储删除失败会返回清理提示。保存画廊二次创作时复制底图，避免原作品更新破坏用户图层。
- `GET /api/assets` 返回当前用户素材及配额；上传无需先保存车衣。
- `DELETE /api/assets?id=...` 校验归属后，先删除 R2 中该附件的原文件，再标记数据库记录为已删除并释放配额。R2 删除失败则保留记录和配额，允许重试；重复删除不存在的对象按成功处理。车衣成品图和封面不删除。
- `GET /api/assets?image=...` 校验所属用户且附件未删除后返回图片。打开引用已删除附件的车衣时，接口返回 `sourceAssetsDeleted`；编辑器使用 `GET /api/wraps/:id?texture=1` 的已保存成品图恢复为单层画布并提示用户。此过程不重写数据库快照，仍由用户点击保存后写入。
- `/wraps` 是用户车衣列表；旧 `/projects` 页面仅保留书签跳转，不再有项目 API。
- R2：纹理与 AI 输出使用 `design/YYYYMM/`，封面使用 `cover/YYYYMM/`，用户上传使用 `storage/YYYYMM/`。
- 数据库的 private 标记仅限制应用列表/写入权限；当前存储服务返回可读取 URL。真正私有桶与签名 URL 属于独立存储访问控制需求。

## 旧数据迁移

`scripts/migrate-user-owned-wraps.ts` 仅处理本地 SQLite。默认只读审计；`--apply` 自动执行 VACUUM 备份，在事务中迁移并检查行数和外键。目标 DDL 为 `scripts/migrations/user-owned-wraps-schema.sql`。

迁移保留车衣 ID、画布 JSON、用户归属、公开 slug、素材 ID 及 Remix 历史；旧封面和纹理引用移入对应车衣/画廊/生成任务。原附件表中 upload / storage / ai-input 进入 user_asset，其余资源不再计入用户上传配额；完整旧元数据保留在备份中。不删除任何 R2 文件。

三种方言 schema 已同步；该脚本不连接远程库，也不是 PostgreSQL/MySQL/D1 的生产迁移。生产环境需要先生成并审核对应迁移，不能直接对旧库执行 db:push。

## 作品点赞计数

`design.like_count` 为非空整数，默认 0。点赞与取消点赞原子加减，最小为 0；只允许公开、已审核、未删除的作品。无需登录、不记录点赞者，没有专门的点赞表。页面内存记录本次点赞状态，刷新后重置；刷新前可取消本次点赞。

SQLite / D1 迁移：`scripts/migrations/20261009-design-like-counter.sql`，先汇总旧记录，再移除旧表。部署前备份并审核；本地已备份迁移，远程未执行。

## `design_tag` — 作品标签

| 字段         | 可空 | 默认值   | 作用                 |
| ------------ | ---- | -------- | -------------------- |
| `id`         | 否   | —        | 主键。               |
| `slug`       | 否   | —        | 标签稳定标识，唯一。 |
| `name`       | 否   | —        | 标签显示名称。       |
| `created_at` | 否   | 当前时间 | 创建时间。           |

## `design_tag_link` — 作品与标签关联

| 字段        | 可空 | 默认值 | 作用                                       |
| ----------- | ---- | ------ | ------------------------------------------ |
| `id`        | 否   | —      | 主键。                                     |
| `design_id` | 否   | —      | 关联 `design.id`；作品删除时级联删除。     |
| `tag_id`    | 否   | —      | 关联 `design_tag.id`；标签删除时级联删除。 |

约束：`(design_id, tag_id)` 唯一，防止同一作品重复绑定同一标签。

## `design_remix` — 作品 Remix 记录

记录用户以公开作品开始二次创作的操作。打开时只产生本地草稿，点击保存后才创建车衣。

| 字段               | 可空 | 默认值   | 作用                                                                                    |
| ------------------ | ---- | -------- | --------------------------------------------------------------------------------------- |
| `id`               | 否   | —        | 主键。                                                                                  |
| `source_design_id` | 否   | —        | 来源作品，外键关联 `design.id`。                                                        |
| `target_wrap_id`   | 是   | `null`   | 历史 Remix 目标车衣，外键关联 `user_wrap.id`，删除车衣时置空。新打开的草稿没有车衣 ID。 |
| `user_id`          | 否   | —        | 执行 Remix 的用户，外键关联 `user.id`；用户删除时级联删除。                             |
| `idempotency_key`  | 否   | —        | Remix 请求幂等键，唯一。                                                                |
| `created_at`       | 否   | 当前时间 | 创建时间。                                                                              |

约束：`target_wrap_id` 非空时唯一；`idempotency_key` 唯一。新车衣的来源由 `user_wrap.source_design_id` 记录。

## `design_report` — 作品举报

保存用户举报、管理员处理结果及审计信息。

| 字段              | 可空 | 默认值   | 作用                                                   |
| ----------------- | ---- | -------- | ------------------------------------------------------ |
| `id`              | 否   | —        | 主键。                                                 |
| `design_id`       | 否   | —        | 被举报作品，外键关联 `design.id`；作品删除时级联删除。 |
| `reporter_id`     | 否   | —        | 举报用户，外键关联 `user.id`；用户删除时级联删除。     |
| `reason`          | 否   | —        | 举报原因代码。                                         |
| `details`         | 是   | `null`   | 用户补充说明。                                         |
| `status`          | 否   | `open`   | 处理状态，例如 `open`、`resolved`、`dismissed`。       |
| `idempotency_key` | 否   | —        | 举报请求幂等键，唯一。                                 |
| `resolved_by`     | 是   | `null`   | 处理管理员，外键关联 `user.id`。                       |
| `resolved_at`     | 是   | `null`   | 处理完成时间。                                         |
| `resolution_note` | 是   | `null`   | 管理员处理备注。                                       |
| `created_at`      | 否   | 当前时间 | 创建时间。                                             |
| `updated_at`      | 否   | 当前时间 | 最后更新时间。                                         |

索引与约束：`idempotency_key` 唯一；`(status, created_at)` 用于举报队列；`(design_id, status)` 用于查看单个作品的举报情况。

### 首页 Hero 配置

`src/lib/vehicle-catalog.ts` 中车型的可选 `hero` 字段控制首页车型入口：`label` 为展示名称、`order` 为排序（越小越靠前），`thumbnail` 为车型缩略图。删除该字段即可隐藏车型。默认启用 Model Y Legacy（`model-y-legacy`）和 Model 3 Legacy（`model-3-legacy`）。

后台手动添加的车衣自动审核通过，`show_in_hero` 默认关闭；可在 `/admin/designs` 列表切换。每个车型取最新的 8 款，普通用户发布仍走待审核流程。

### AI 冻结积分与封面

AI 提交时在同一事务中创建任务和 `credit.transaction_type=reserve` 记录，分配来源积分，降低可用余额但不计入消耗。生成结果成功存储后，在完成事务中将该记录转为 `consume`；扣除时间为结算时间。失败或取消释放冻结，不产生消耗；旧版预扣任务仍支持退款。`credit.metadata.reservedAt` 用于还原冻结期间和积分过期时的历史余额，无需新增字段。

`renderVehicleCover` 是编辑保存、两个 AI 入口及后台添加车衣共用的封面生成方法。AI 的封面元数据保存在 `ai_task.task_result` 中。关闭开放画廊的付费用户作品保存为 `design.visibility=private`、`moderation_status=private`，仅在后台全部列表可见，不进入审核和公共接口。

## 2026-10-10 用户车衣与发布分工迁移

本地 SQLite 使用 `scripts/migrate-wrap-publication.ts`：默认只读，`--apply` 先备份；补齐成功 AI 结果和无来源社区记录的用户车衣；待审、拒绝、私有记录转移到用户车衣审核状态；保留已发布记录、链接、统计；移除 user_wrap 的 name / cover_key / cover_url 字段。迁移不删除 R2 对象。远程数据库需单独审核对应方言迁移后执行。

## 2026-10-12 作品名称迁移

本地运行 `node --import tsx scripts/migrate-wrap-names.ts` 预览，追加 `--apply` 自动备份并新增、补齐 `user_wrap.name`。保留已有名称；空名称优先沿用已有社区标题，其次按关联 AI 提示词生成，最后使用车型名称。重复执行不会覆盖审核改名；不改变画布版本和保存时间。旧版发布分工迁移须先执行，再执行本迁移。SQLite/PostgreSQL/MySQL schema 均含名称字段。生产数据库需先审核并应用对应方言的加列迁移，回填时复用 `aiWrapName` 的规则；本地迁移脚本拒绝远程地址。
