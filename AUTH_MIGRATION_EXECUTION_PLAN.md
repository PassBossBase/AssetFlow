# Better Auth 认证重建执行清单（临时）

> 目的：在清空现有测试账号与测试素材后，从 Convex Auth 切换至 Better Auth，同时保证注册、登录、项目创建、素材上传、项目改名与素材改名可用。
>
> 本文件是实施期间的工作清单；认证切换稳定并完成验收后可删除。

## 已确认的范围

- 现有账号、项目、素材、上传任务、个人资料与关联存储文件均为测试数据，可清理。
- 不迁移旧用户 ID、旧密码哈希、旧会话或旧资源归属。
- 新用户完成「人机校验 → 设置密码」后才获得有效会话；邮箱当前仅校验格式，不启用邮箱 OTP。
- 使用 Better Auth 与 `@convex-dev/better-auth` 的 Convex 集成。
- 每周一按中国时区强制重新登录；开发/测试环境使用 5–10 分钟短会话验证。

## 不在本次范围

- 旧账号激活、旧密码迁移或旧资源归属映射。
- 社交登录、Passkey、双因素认证、组织/团队权限。
- 自动化素材整理、标签、语义搜索。
- 工作台视觉改版。

## 目标后端边界

```text
浏览器
  ├─ Better Auth 客户端：注册、登录、人机验证、退出
  └─ Convex 客户端：项目、素材、上传、个人资料
                     │
                     ▼
            requireCurrentUser(ctx)
                     │
                     ▼
     Better Auth 真实会话校验 + 当前 user.id
                     │
                     ▼
       projects / assets / uploadTasks / profiles
```

所有业务函数必须使用同一个 `requireCurrentUser(ctx)`；不得继续使用旧的 `getAuthUserId()`，也不得只依赖未经 Better Auth 会话验证的 JWT 身份。

## 实施顺序

### 0. 上线前准备

- [ ] 在独立开发/预发布 Convex 部署演练，生产与测试部署保持独立。
- [ ] 锁定 Better Auth、Convex 与 `@convex-dev/better-auth` 的版本。
- [ ] 配置后端环境变量：Better Auth 密钥、站点地址、验证码服务密钥；不写入仓库或前端环境文件。
- [ ] 新建自动化测试基础：单元/集成测试与 Playwright E2E。

### 1. 清理现有测试数据

- [ ] 先只读盘点：用户、项目、素材、上传任务、个人资料及存储文件数量。
- [ ] 暂停写入或启用维护窗口，防止清理过程中产生新文件。
- [ ] 以受限的内部、批量、可续跑维护函数清理：
  - [ ] 素材和头像关联的存储文件。
  - [ ] `uploadTasks`、`assets`、`projects`、`userProfiles`、`ownershipMigrations`。
  - [ ] 旧 Convex Auth 账号、会话、账户记录。
- [ ] 清理完成后再次核对业务记录、认证记录和存储引用均为零。
- [ ] 清理工具不得暴露为浏览器可调用的“清空数据”接口。

### 2. Better Auth 基础接入

- [ ] 安装并配置 Better Auth 与 Convex Component。
- [ ] 新增 Better Auth Component、生成其 schema，并在 `convex/convex.config.ts` 注册。
- [ ] 改写 `convex/auth.config.ts` 为 Better Auth Provider。
- [ ] 改写 `convex/http.ts`，注册 Better Auth 路由；删除旧 Convex Auth HTTP 路由。
- [ ] 增加 Next.js 认证代理路由、Better Auth client/server helpers 与 `ConvexBetterAuthProvider`。
- [ ] 删除旧的 `convex/auth.ts`、`authTables` 依赖与旧认证包。
- [ ] 更新项目认证规范与 README 中过时的 Convex Auth 说明。

### 3. 统一业务鉴权

- [ ] 新增 `convex/authz.ts`，提供唯一的 `requireCurrentUser(ctx)`。
- [ ] 使用 Better Auth Component 的会话验证能力，而非仅使用 `ctx.auth.getUserIdentity()`。
- [ ] 替换以下模块中所有旧 `getAuthUserId()` 调用：
  - [ ] `convex/assets.ts`
  - [ ] `convex/uploadTasks.ts`
  - [ ] `convex/projects.ts`
  - [ ] `convex/dashboard.ts`
  - [ ] `convex/users.ts`
- [ ] `users.current` 改为从 Better Auth 获取用户邮箱/名称，不再 `ctx.db.get(userId)` 读取旧认证表。
- [ ] 业务表继续以 `userId: string` 保存 Better Auth 的新 user id；由于数据已清空，无需做数据映射。
- [ ] 删除 `convex/migrations.ts` 与 `ownershipMigrations` 表。

### 4. 注册安全链路

- [ ] 注册和登录前服务端验证 CAPTCHA token；前端展示校验组件不等于安全完成。
- [ ] 邮箱当前仅校验格式，注册成功后可直接建立有效会话并访问业务函数。
- [ ] 启用持久化限流，分别限制注册、登录和验证码失败。
- [ ] 返回通用错误信息，避免通过接口判断某邮箱是否已注册。
- [ ] 验证码服务、限流失效时提供可恢复的用户提示与服务端日志。

### 5. 上传与存储逻辑收口

- [ ] 删除或内部化 `assets.create()`，素材创建只能通过上传任务完成。
- [ ] `uploadTasks` 增加已上传文件的 `storageId` 与明确状态，例如“上传中 / 文件待确认 / 失败 / 中断”。
- [ ] 上传文件后先执行 `attachStorage(taskId, storageId)`：
  - [ ] 检查任务与当前用户、项目归属一致。
  - [ ] 从 Convex `_storage` 读取真实文件大小和 Content-Type。
  - [ ] 校验真实元数据与允许类型、大小限制和任务声明一致。
  - [ ] 原子写入任务的 `storageId`。
- [ ] `complete(taskId)` 只使用任务已绑定的 `storageId` 创建素材，不能接收任意存储 ID。
- [ ] 头像上传采用相同的真实元数据校验与归属绑定规则。
- [ ] 失败、重试、删除和过期任务正确处理已绑定的存储文件。
- [ ] 增加延迟存储垃圾回收：仅删除超过保留时间且未被素材、头像或上传任务引用的文件。
- [ ] 上传进度在服务端限频且只允许递增；不要只相信前端节流。
- [ ] 上传中断阈值从当前约 12 秒提高至至少 5 分钟，避免移动端切后台误判。

### 6. 会话与每周重新登录

- [ ] 禁用会话滑动续期：`disableSessionRefresh: true`。
- [ ] 不启用会绕过即时撤销检查的长时间 Cookie 缓存。
- [ ] 增加内部会话撤销函数与 `convex/crons.ts`。
- [ ] 中国时区周一 00:05 的 cron 使用 UTC：`5 16 * * 0`。
- [ ] 会话撤销需批量处理，支持失败重试和运行日志。
- [ ] 会话撤销前，把仍在上传的任务标记为 `interrupted`；重新登录后允许按规则重试。
- [ ] 开发/测试部署通过后端配置把会话缩短为 5–10 分钟。

## 必须修复的现有逻辑问题

- [ ] 当前各业务模块重复定义用户校验 helper，切换后会产生鉴权不一致；统一到 `authz.ts`。
- [ ] 当前 `users.current` 直接读取旧认证用户表，Better Auth 切换后会失效。
- [ ] 当前 `uploadTasks.complete()` 信任客户端传入的 `storageId` 和元数据，必须改为任务绑定后校验。
- [ ] 当前前端 4 秒 heartbeat、后端约 12 秒超时，网络抖动时会误判并遗留存储文件。
- [ ] 当前 `projects.list()` 会对每个项目读取全部素材，`dashboard.overview()` 会读取并内存排序全部素材；本次记录为后续性能优化，不阻塞认证切换。
- [ ] 当前 `projects.remove()` 单次删除全部素材和存储文件；大项目应后续改为“标记删除 + 内部分批清理”。

## 上线阻断验收

### 认证与安全

- [ ] 新用户：CAPTCHA 失败、重复提交、重复邮箱、注册频率超限均被正确处理。
- [ ] 新用户：CAPTCHA → 设置密码 → 登录成功。
- [ ] 登录、退出、错误密码、会话过期均有明确且不泄露账户信息的反馈。
- [ ] 周一会话清理后，现有页面刷新与任意 Convex mutation 都被拒绝并回到登录页。
- [ ] 测试部署短会话到期后，效果与周一清理一致。

### 项目与素材主流程

- [ ] 登录后创建项目。
- [ ] 修改项目名称与描述。
- [ ] 上传 PNG、JPG、WEBP、SVG、GIF、GLB、GLTF，并验证真实预览。
- [ ] 修改素材名称、下载素材、删除素材、移动素材。
- [ ] 删除项目时清理关联素材、上传任务与存储文件。
- [ ] 图片/GIF/SVG/GLB/GLTF 预览在移动端可用，并覆盖预览失败状态。

### 权限与失败路径

- [ ] 账号 B 无法读取、下载、重命名、移动、删除账号 A 的项目、素材、任务或头像。
- [ ] 伪造 MIME、文件大小、扩展名或 `storageId` 时，后端拒绝完成上传。
- [ ] 上传成功但确认前关闭页面、网络断开、会话失效后，不会生成可见的脏素材；延迟清理能回收孤立文件。
- [ ] 大文件、移动端切后台和网络抖动不会在十几秒内被错误标为中断。

## 切换与回滚

- [ ] 先在预发布环境完成全部验收，再进入生产维护窗口。
- [ ] 切换前记录部署版本、数据盘点与环境变量是否齐全；不记录密钥值。
- [ ] 切换失败时回退代码与认证配置；由于测试数据已明确可清理，不承诺保留切换前账号数据。
- [ ] 生产切换后观察认证失败率、上传失败率、存储垃圾回收日志与 Cron 执行记录。

## 完成定义

以下全部满足才算迁移完成：

- [ ] 不再依赖 `@convex-dev/auth`、旧 `authTables`、旧 `getAuthUserId()` 或旧迁移逻辑。
- [ ] Better Auth 的人机验证、持久化限流和会话策略已在预发布验证。
- [ ] 所有 Convex 业务函数经统一且真实的 Better Auth 会话校验。
- [ ] 注册、登录、创建项目、素材上传、项目改名、素材改名全部通过自动化和手工验收。
- [ ] 周一强制重新登录及短会话测试通过。
- [ ] 无遗留测试账号、资源记录、上传任务和孤立存储文件。
