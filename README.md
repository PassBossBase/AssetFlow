# AssetFlow AI

AssetFlow AI 是面向开发者、设计师和游戏开发者的数字资产工作空间，用于上传、管理、预览、下载和复用图片及 3D 素材。

## 当前功能

### 账户与工作台

- 邮箱密码注册、登录、退出登录与切换账号。
- 密码由 Convex Auth 安全哈希处理；浏览器不会保存明文密码。
- 工作台展示项目总数、素材总数、存储占用、最近素材与最近项目。
- 个人中心支持头像、显示名称、登录邮箱展示和界面语言设置。
- 支持 English / 简体中文切换，并在本地保留语言偏好。

### 项目管理

- 创建、编辑和删除项目，项目描述最长 500 个字符。
- 项目卡片展示素材数、创建日期和常用操作；无项目时仍提供“新建项目”卡片。
- 支持通过拖动手柄互换两个项目卡片的位置；放置前会用虚线边框标记目标卡片。
- 删除项目时会同时清理关联素材、上传任务和存储文件。

### 素材管理与预览

- 支持 PNG、JPG、WEBP、SVG、GIF、GLB、GLTF，单文件最大 250 MB。
- 支持上传进度、失败重试、任务删除、名称搜索、类型筛选、重命名、删除和下载。
- 图片、SVG、GIF 支持在线预览；GLB / GLTF 支持浏览器内旋转和缩放预览。
- 素材详情页提供预览、元数据和直接重命名操作。

## 已知限制

- 独立 GLTF 如果依赖外部 `.bin` 或纹理文件，无法保证完整预览。
- 图片以等比方式展示，暂不提供独立缩放控制。

## 技术栈

- Next.js 16、React 19、TypeScript、Tailwind CSS、shadcn/ui
- Convex Auth、Convex Database、Convex File Storage
- React Three Fiber、Three.js、@react-three/drei（仅用于 GLB / GLTF 预览）
- Zod、React Hook Form、Motion、pnpm

## 从 GitHub 克隆并启动

### 前置条件

- Node.js 与 pnpm
- 一个 Convex 账号，或团队 Convex 部署的访问权限

```bash
pnpm install
Copy-Item .env.example .env.local
```

在 macOS / Linux 中，将第二行替换为：

```bash
cp .env.example .env.local
```

### 连接 Convex 开发部署

认证、数据库、后端函数和文件存储均运行在 Convex。克隆仓库后，请创建自己的开发部署，或选择你有访问权限的团队开发部署：

```bash
pnpm convex:dev
```

该命令会连接当前项目、同步 `convex/` 下的函数和数据模型，并把前端连接地址写入 `.env.local`：

```dotenv
NEXT_PUBLIC_CONVEX_URL=https://<deployment>.convex.cloud
```

保持该命令运行，便于本地开发时同步后端变更。

### 初始化 Convex Auth

首次连接新的 Convex 部署后，执行：

```bash
pnpm exec @convex-dev/auth --web-server-url http://localhost:3000
```

该命令会在当前 Convex 部署中配置认证所需的 `SITE_URL`、`JWT_PRIVATE_KEY` 和 `JWKS`。它们属于后端部署环境变量，不能写入 `.env.local`、提交到 Git、复制到聊天记录或截图中。

如果命令提示已有密钥，除非正在进行计划性的密钥轮换，否则不要覆盖。覆盖密钥会使现有登录会话失效。

生产部署应使用生产站点地址单独初始化，且必须使用独立密钥。`CONVEX_SITE_URL` 是 Convex 后端自动提供的系统变量，无需手动设置。

### 启动前端

另开一个终端：

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。首次使用可在登录页创建账号，再进入工作台创建项目和上传素材。

## 安全与环境注意事项

- `.env.local`、`.convex/`、真实部署地址、认证私钥和第三方服务密钥不得提交到 Git。
- 每个开发部署、测试部署和生产部署应使用独立的数据与认证密钥。
- 素材、项目和个人资料均按当前登录用户隔离；下载和删除操作必须经过权限校验。

## 主要路由

- `/`：入口页
- `/sign-in`：登录与注册
- `/dashboard`：工作台
- `/dashboard/projects`：项目管理
- `/dashboard/profile`：个人中心
- `/project/[id]`：项目素材空间
- `/asset/[id]`：素材详情与预览

## 验证

```bash
pnpm typecheck
pnpm lint
```
