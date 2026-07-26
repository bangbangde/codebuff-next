# codebuff-next

CQ's Lab 的 Next.js 应用。Compose 只提供 PostgreSQL 和 Garage；Next.js、数据库迁移和首次账户初始化都在宿主机显式运行。首次设置：

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
docker compose -f docker-compose-dev.yml up --detach --wait
pnpm db:migrate
pnpm auth:bootstrap
pnpm dev
```

`pnpm auth:bootstrap` 只需在首次创建本地账户时执行。日常开发只需确保基础设施健康，然后启动应用：

```powershell
docker compose -f docker-compose-dev.yml up --detach --wait
pnpm dev
```

Compose 不启动应用，也不自动执行迁移或账户初始化。Garage 会在自己的容器内配置并复用单节点 layout。

## PostgreSQL 基础

数据库层使用 Drizzle ORM、`pg` 连接池和 PostgreSQL 18。Better Auth 只负责生成当前认证模型；`lib/auth/schema-config.ts` 是生成器输入，不是可挂载的认证处理器。

应用和迁移器在真正访问数据库时才读取配置，因此 `pnpm build` 不需要数据库连通性或数据库凭据。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PG_USER` | 无 | 必填；由基础设施按迁移/运行阶段分别注入 |
| `PG_PWD` | 无 | 必填；由基础设施按迁移/运行阶段分别注入 |
| `PG_HOST` | `postgres` | 非生产环境可覆盖 |
| `PG_PORT` | `5432` | 非生产环境可覆盖 |
| `PG_DB` | `codebuff_next` | 非生产环境可覆盖 |
| `PG_POOL_MAX` | `5` | 应用连接池上限；迁移器固定覆盖为 1 |
| `PG_CONNECTION_TIMEOUT_MS` | `10000` | 建立数据库连接的超时时间，单位为毫秒 |

数据库日志不得输出密码或完整连接串。

### Schema 与迁移

认证 schema 和 SQL 都是版本化、可审查的仓库产物：

```bash
pnpm auth:schema
pnpm db:generate
```

提交变更前需同时审查 `lib/db/schema.ts`、`drizzle/*.sql` 和 `drizzle/meta/`。生产环境禁止使用 `drizzle-kit push`；所有结构变化都必须先生成并提交 SQL，再由迁移器执行。

本地执行迁移：

```powershell
pnpm db:migrate
```

`pnpm db:migrate` 和 `pnpm auth:bootstrap` 会在 `.env` 存在时读取它；当前进程已经提供的变量仍可用于覆盖配置。拉取到新的迁移文件后，需要再次显式执行迁移。

最终应用镜像包含经过 bundling 的迁移和账户初始化入口，不复制项目完整的 `node_modules`：

```bash
node runtime-tools/db/migrate.cjs
node runtime-tools/auth/bootstrap-user.cjs
```

迁移器只执行尚未记录的迁移。没有待执行迁移时正常退出，失败时以非零状态退出；它不会在镜像构建、应用启动或请求处理中自动运行。基础设施应在发布应用前，以同一镜像和迁移角色执行该入口。

### CI 校验边界

CI 会重新生成认证 schema 和 Drizzle migration，并通过 `git diff` 确认 `lib/db/schema.ts` 与 `drizzle/` 已提交且保持同步。`pnpm build` 同时生成最终镜像使用的迁移器和账户初始化 bundle。

CI 不连接 PostgreSQL，也不查询真实表结构、执行业务 DML、检查角色权限或模拟生产迁移。生产部署仍应在启动新版本应用前，使用基础设施提供的迁移凭据执行镜像内迁移入口。

## 当前认证边界

当前运行时提供认证 API、邮箱密码登录、受保护的账户页、TOTP 双因素认证和一次性首个账户初始化，公开注册始终关闭。schema 同时保留 Passkey 相关表，但运行时尚未启用 Passkey 插件，因此不能把表结构存在等同于 Passkey 功能可用。

## 常用校验

```bash
pnpm lint
pnpm build
git diff --check
```

## 认证运行时

认证 API 只会在 `/api/auth/*` 请求和受保护的 `/account` 页面访问时初始化。公开的 Landing、Notes、Me 和 `/sign-in` 不读取数据库或认证密钥。

运行时除 PostgreSQL 变量外还需要：

| 环境变量 | 说明 |
| --- | --- |
| `BETTER_AUTH_URL` | 站点的公开 origin；生产环境必须使用 HTTPS，本机开发允许 `http://localhost` 或 `http://127.0.0.1` |
| `BETTER_AUTH_SECRETS` | 版本化密钥列表，例如 `2:<current-secret>,1:<previous-secret>`；每个密钥至少 32 个字符，首项用于新数据 |

公开注册始终关闭。首次账户由运维人员在应用镜像中通过一次性命令创建；姓名、邮箱和密码只从当前进程环境读取，命令不会输出这些值：

```bash
AUTH_BOOTSTRAP_NAME="CQ" \
AUTH_BOOTSTRAP_EMAIL="owner@example.com" \
AUTH_BOOTSTRAP_PASSWORD="<15-to-128-character-password>" \
node scripts/bootstrap-auth-user.mjs
```

该命令使用运行时 PostgreSQL 角色，密码通过 Better Auth 的默认 scrypt 实现散列。邮箱已存在时命令默认失败，不会覆盖既有账户。可重复执行的本地初始化可以额外设置 `AUTH_BOOTSTRAP_IF_MISSING=true`，此时同一邮箱已存在会作为成功跳过，其他错误仍会失败。
