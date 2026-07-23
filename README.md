# codebuff-next

CQ's Lab 的 Next.js 应用。项目使用 `pnpm`，本地启动方式：

```bash
pnpm install --frozen-lockfile
pnpm dev
```

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

数据库日志不得输出密码或完整连接串。

### Schema 与迁移

认证 schema 和 SQL 都是版本化、可审查的仓库产物：

```bash
pnpm auth:schema
pnpm db:generate
```

提交变更前需同时审查 `lib/db/schema.ts`、`drizzle/*.sql` 和 `drizzle/meta/`。生产环境禁止使用 `drizzle-kit push`；所有结构变化都必须先生成并提交 SQL，再由迁移器执行。

本地构建并执行迁移：

```powershell
pnpm build:migrate
$env:PG_HOST = "127.0.0.1"
$env:PG_USER = "migration-role"
$env:PG_PWD = "migration-password"
pnpm db:migrate
```

最终应用镜像包含相同入口：

```bash
node migrate/index.js
```

迁移器只执行尚未记录的迁移。没有待执行迁移时正常退出，失败时以非零状态退出；它不会在镜像构建、应用启动或请求处理中自动运行。基础设施应在发布应用前，以同一镜像和迁移角色执行该入口。

### 权限边界

- 迁移角色拥有应用数据库对象，可执行 DDL。
- 运行角色只获得 `public` schema 的使用权限，以及当前/未来业务表的 `SELECT`、`INSERT`、`UPDATE`、`DELETE` 权限；不得执行 DDL，也不得读取 Drizzle 迁移日志。
- CI 使用与基础设施相同摘要的 PostgreSQL 18.4 镜像，验证空库迁移、重复执行无变化、全部认证表 DML、运行角色 DDL 拒绝，以及最终应用镜像内的迁移入口。

## 当前认证边界

当前 schema 覆盖用户、账号密码凭据、会话、验证、TOTP/恢复码、Passkey 和数据库限流，但 Issue #47 不提供认证 API、登录 UI 或首个用户初始化。

M006 要求 Passkey 用户验证（UV）为 `required`。固定的 `@better-auth/passkey@1.6.23` 可生成所需表，并可在注册选项中声明该偏好，但尚未在认证验证阶段强制 UV。因此后续认证路由在解决并测试这一差距前，不得直接挂载当前生成配置。

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

该命令使用运行时 PostgreSQL 角色，密码通过 Better Auth 的默认 scrypt 实现散列。邮箱已存在时命令会失败，不会覆盖既有账户。
