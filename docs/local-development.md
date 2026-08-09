# 本地开发环境

仓库使用宿主机 Git worktree 作为源码与提交的唯一权威来源，并为每个 worktree 创建独立的本地运行环境。环境身份由 worktree 绝对路径生成，不依赖当前分支或提交。

## 前置条件

- Node.js 与 pnpm 版本遵循 `mise.toml` 和 `package.json`。
- Docker Desktop 或兼容的 Docker Engine 正在运行。
- Windows 上应允许当前终端访问 Docker Desktop named pipe。

运行诊断：

```powershell
pnpm local:doctor
```

## 首次初始化

```powershell
pnpm install --frozen-lockfile
pnpm local:bootstrap
```

`local:bootstrap` 会：

1. 在 `.dev/instance.json` 中创建稳定实例身份、端口分配和本地开发密钥。
2. 生成 `.dev/environment.env` 供 Compose 使用。
3. 使用唯一 Compose project 启动 PostgreSQL 和 Garage，并只在 loopback 暴露独立的 Garage Admin API 端口；Garage 官方镜像以 `--single-node` 启动，不创建默认 key 或 bucket。
4. 通过与生产相同的部署 CLI，把 `.dev/` 预生成的固定运行时 key 幂等导入 Garage。
5. 通过该部署 CLI 执行完整 Drizzle migration、幂等创建业务 bucket 并收敛运行时权限。
6. 幂等创建本地管理员。
7. 输出实例 ID、应用 URL 和服务状态，不输出密钥。

`.dev/` 被 Git 忽略。不要在 worktree 之间复制 `.env` 或 `.dev/`；每个 worktree 必须拥有自己的实例、端口、凭据和数据卷。

本地开发不要求手工提供业务环境变量；CLI 自动生成的变量以及生产部署的变量边界见 [`environment-variables.md`](environment-variables.md)。

## 运行应用

推荐的快速开发模式在宿主机运行 Next.js，在容器中运行 PostgreSQL 和 Garage：

```powershell
pnpm local:dev
```

该命令会先幂等执行 bootstrap，再在分配的应用端口运行 `next dev`。使用 `pnpm local:status` 查看实际 URL。

完整容器模式在同一 Compose project 中运行 app、PostgreSQL 和 Garage：

```powershell
pnpm local:container:dev
```

app 容器 bind mount 当前 worktree；Codex、Git、diff、commit 和 push 仍在宿主机执行。容器使用独立的 `node_modules` 与 `.next` volume，不读取宿主机依赖或缓存。

Next.js 的版本内文档建议 Windows/macOS 日常开发优先使用宿主机 `next dev`，因为 Docker 文件系统可能显著拖慢 HMR。因此容器模式主要用于 Linux 一致性检查、构建和集成验证。

## 常用命令

| 命令 | 行为 |
| --- | --- |
| `pnpm local:bootstrap` | 创建或修复当前 worktree 环境，执行 migration 和管理员初始化 |
| `pnpm local:up` | 只启动 PostgreSQL 和 Garage |
| `pnpm local:dev` | bootstrap 后在宿主机启动 Next.js |
| `pnpm local:container:dev` | bootstrap 后在 app 容器启动 Next.js |
| `pnpm local:status` | 显示实例、端口、URL 和 Compose 状态 |
| `pnpm local:doctor` | 检查 Node、pnpm、Docker、Compose 和渲染后的 Compose 配置 |
| `pnpm local:verify` | 运行 lint、typecheck、production build 和 `git diff --check` |
| `pnpm local:container:verify` | 在 app 容器运行 lint、typecheck 和 production build；使用一次性 `.next` volume |
| `pnpm local:stop` | 停止当前实例，保留数据卷和实例配置 |
| `pnpm local:reset` | 删除当前实例的数据卷后重新 bootstrap |
| `pnpm local:destroy` | 删除当前实例的 Compose 资源、数据卷和 `.dev/` 配置 |

`local:reset` 和 `local:destroy` 是破坏性命令，但编排器会先验证 `.dev/instance.json`、worktree 绝对路径和 Compose project，只允许操作当前实例。

## 数据隔离

每个实例使用：

- 唯一 `codebuff-<instance-id>` Compose project；
- 独立 PostgreSQL 和 Garage 2.x volume；
- 独立 app、PostgreSQL、Garage S3/RPC/Web/Admin 宿主机端口；
- 独立 PostgreSQL 密码、Better Auth secret、Garage Admin token、运行时 key 和 bucket；
- 固定的本地管理员邮箱 `admin@codebuff.local` 和开发密码 `Local-Dev-Bootstrap-Password`。

本地管理员凭据和 Garage Admin token 只适用于绑定 loopback 的本地实例，不能用于生产。app 容器只接收 `OBJECT_STORAGE_*` 运行时凭据，不接收 Garage Admin token。

Garage 1.x 的本地数据不会原地升级。首次使用 Garage 2.x 配置启动时，会创建新的 `garage_v2_data` volume，并让旧的 `garage_data` volume 保持脱离状态。如果仍需要旧对象，请在运行 `pnpm local:reset` 或 `pnpm local:destroy` 前先导出；这些破坏性命令可能删除两个 volume。

## 故障诊断

先运行：

```powershell
pnpm local:doctor
pnpm local:status
```

常见问题：

- Docker 不可访问：启动 Docker Desktop，并确认当前终端可访问 Docker named pipe。
- Compose 配置错误：检查 `.dev/environment.env` 是否由当前脚本生成，不要手工编辑。
- 端口被占用：保留的实例端口不会自动漂移；先停止占用程序，或销毁当前实例后重新 bootstrap。
- migration 失败：检查 PostgreSQL health 和 `pnpm local:status`，不要直接修改已提交 migration。
- Garage 失败：检查 `pnpm local:status` 输出的 Admin endpoint 和当前 Compose project 的 Garage 日志，不要把 Admin token、运行时 key 或 secret 输出到 Issue/PR。

如需直接执行 Compose 调试，必须从 `pnpm local:status` 获取当前 Compose project 和 `.dev/environment.env`，始终同时传入 `-p`、`--env-file` 和 `-f local-development/compose.yml`，避免操作其他 worktree。

## Codex Local Environment

Codex Desktop 的 worktree setup 应只执行有限初始化，不启动长期前台进程：

```text
pnpm install --frozen-lockfile
pnpm local:bootstrap
```

推荐配置 Start app、Start container app、Status、Doctor、Verify、Stop、Reset 和 Destroy actions，并让这些 actions 调用上表中的仓库命令，不复制编排逻辑。

Local Environment 需要在 Codex Desktop 的设置面板中创建；保存后，应用会在项目根目录生成可提交的 `.codex` 配置。应提交该生成文件以共享 setup 与 actions，不要手写未公开的配置格式。
