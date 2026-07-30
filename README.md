# AssetFlow AI

AssetFlow AI 是面向开发者、设计师和游戏开发者的数字资产管理平台，用于上传、整理、预览、下载和复用图片及 3D 素材。

**当前阶段：Phase 4 素材预览收尾验收。**

## 当前功能

### 账户与工作台

- 邮箱密码注册、登录、退出登录与切换账号。
- 密码由 Convex Auth 进行安全哈希处理；浏览器不再保存“记住密码”的明文凭据。
- 工作台展示项目总数、素材总数、存储占用、最近素材与最近项目。
- 个人中心支持更换头像、修改显示名称、查看登录邮箱和设置界面语言；头像与显示名称同步显示在侧边栏和账户菜单。
- 基础界面提供 English / 简体中文切换，并在本地保留语言偏好。

### 项目管理

- 创建、编辑、删除项目；项目描述最长 500 个字符。
- 项目卡片展示素材数、创建日期和常用操作；无项目时仍默认展示“新建项目”卡片。
- 支持通过拖动手柄交换两个项目卡片的位置；拖动时保留完整卡片预览，目标卡片以白色虚线边框提示放置位置。
- 删除项目会级联清理关联素材、上传任务及 Convex File Storage 文件。

### 素材管理与预览

- 支持 PNG、JPG、WEBP、SVG、GIF、GLB、GLTF，单文件最大 250 MB。
- 支持上传队列进度、失败重试、任务删除、名称搜索、类型筛选、重命名、删除和下载。
- 图片、SVG、GIF 在线预览；GLB / GLTF 使用 React Three Fiber 提供旋转和缩放预览。
- 素材详情页将预览和元数据合并展示，支持在详情侧栏内直接编辑素材名称。

## 当前边界

- 独立 GLTF 如果依赖外部 `.bin` 或纹理文件，无法保证完整预览。
- 邮件验证与“忘记密码”重设流程尚未接入邮件服务，当前不应视为已实现能力。
- 标签、AI 自动命名 / 描述 / 标签与 AI 搜索属于 Phase 5，尚未实现。

## 技术栈

- Next.js 16、React 19、TypeScript、Tailwind CSS、shadcn/ui
- Convex Auth、Convex Database、Convex File Storage
- React Three Fiber、Three.js、@react-three/drei（仅用于 GLB / GLTF 预览）
- Zod、React Hook Form、Motion、pnpm

## 从 GitHub 克隆并启动

### 前置条件

- Node.js 与 pnpm
- 一个 Convex 账号

```bash
pnpm install
Copy-Item .env.example .env.local
```

在 macOS / Linux 中，将第二行替换为：

```bash
cp .env.example .env.local
```

### 接入自己的 Convex 开发环境

本项目的认证、数据库、后端函数与文件存储均依赖 Convex。克隆仓库后，不能使用原开发者的部署环境；请在本机运行：

```bash
pnpm convex:dev
```

首次运行时，CLI 会要求登录 Convex，并让你创建或选择一个开发部署。完成后会连接该部署、同步 `convex/` 下的函数与数据模型，并更新本机的 Convex 配置。保持该命令运行，便于开发时持续同步后端变更。

`pnpm convex:dev` 会将前端连接地址写入 `.env.local`。该文件至少需要保留：

```dotenv
NEXT_PUBLIC_CONVEX_URL=https://<你的部署>.convex.cloud
SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_CONVEX_URL` 由前端连接 Convex。Convex Auth 使用的 `CONVEX_SITE_URL` 是部署在后端自动提供的系统环境变量，无需、也不应在 `.env.local` 手动配置。后端所需的额外密钥应通过 `pnpm convex env set <名称>` 写入当前 Convex 部署，而不是写进前端环境文件。不要提交 `.env.local`、`.convex/`、邮件服务密钥或任何生产环境地址。仓库中的 `.env.example` 仅作为模板。

团队协作建议为每位开发者创建独立的 Convex 开发部署；测试和生产环境分别使用共享、独立的部署。这样本地测试数据和数据模型改动不会互相影响。

### 启动前端

另开一个终端：

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。首次使用可在登录页创建账号，再进入工作台创建项目和上传素材。

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

除静态检查外，Phase 4 还需在真实登录账户下人工验证图片、GIF、SVG、GLB、GLTF 预览、下载保存、项目级删除清理和移动端体验。
