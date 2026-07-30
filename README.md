# codebuff-next

CQ's Lab 的 Next.js 应用，使用 App Router、TypeScript、Tailwind CSS、本地
MDX、Better Auth、Drizzle ORM 和 PostgreSQL。

## 当前实现

| 路径 | 实现 |
| --- | --- |
| `/` | 站点简介、当前状态和 `Coming Soon...` 占位内容 |
| `/me` | 公开的个人简介与工作方法 |
| `/notes/[slug]` | 从仓库内 MDX 静态生成的文章详情；当前没有 Notes 索引页 |
| `/sign-in` | 邮箱密码、Passkey 登录，以及密码登录后的 TOTP/恢复码验证 |
| `/account` | 查询当前 Session，并在已登录时显示账户、TOTP 与 Passkey 管理界面 |
| `/admin` | 需要独立 Admin role 的后台 Overview 与响应式应用框架 |
| `/api/auth/*` | Better Auth 的 Node.js API |

公共的 `/`、`/me` 和静态文章不依赖数据库。Garage 为文章专属资产提供私有
S3 对象存储；应用只通过服务端上传边界写入，不向浏览器暴露存储凭据。

## 本地开发

Compose 只提供 PostgreSQL 和 Garage；Next.js、数据库迁移和首次账户初始化
都在宿主机显式运行。本地开发刻意让 `PG_USER` 同时作为 PostgreSQL
超级用户、数据库 owner、应用运行账号和迁移账号，以减少本地角色管理成本。
这个便利契约不适用于生产环境。首次设置：

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

Compose 不启动应用，也不自动执行迁移或账户初始化。PostgreSQL healthcheck
会通过 TCP 验证 `.env` 凭据，并确认本地账号仍具有 `SUPERUSER`、
`CREATEDB`、`CREATEROLE` 且拥有目标数据库。Garage 会在自己的容器内配置并复用单节点
layout，并幂等创建 `.env` 指定的私有文章资产桶和仅具写权限的应用密钥。
从 `.env.example` 新建 `.env` 时，本地 Passkey 配置已经包含
`BETTER_AUTH_URL=http://localhost:3000` 与 `PASSKEY_RP_ID=localhost`。如果复用旧的
`.env`，需要手动补齐 `PASSKEY_RP_ID`；它必须与访问应用时使用的 hostname 保持一致。

PostgreSQL 官方镜像只会在数据卷为空时应用 `PG_USER`、`PG_PWD` 和 `PG_DB`
对应的初始化参数。之后修改 `.env` 不会重写卷内角色、密码或数据库 owner；
Compose 会因上述 healthcheck 失败而保持 unhealthy。若确认可以丢弃全部本地
数据库数据，可先停止 Compose，再删除 `codebuff-local_postgres_data` 卷并重新
执行首次设置；不要在需要保留本地数据时删除该卷。

## Notes 内容

每篇文章位于 `content/notes/<slug>/index.mdx`，并导出经过 `defineNote`
校验的 `note` 元数据。目录名和 `slug` 必须一致且使用小写 kebab-case；
`publishedAt`/`updatedAt` 使用 `YYYY-MM-DD`，`language` 当前只接受
`zh-CN` 或 `en`。正文前必须保留 `{/* note-body */}` 标记，阅读时间会从
标记后的中英文内容估算。

构建会枚举所有文章并生成 `/notes/[slug]` 静态参数；未知 slug 不启用动态
回退。文章的 MDX 元素样式集中在 `mdx-components.tsx`。

## PostgreSQL 基础

数据库层使用 Drizzle ORM、`pg` 连接池和 PostgreSQL 18。
`lib/auth/schema-config.ts` 只负责让 Better Auth 生成当前认证 schema，不是
可挂载的认证处理器；实际运行时配置位于 `lib/auth/runtime.ts`。

应用和迁移器在真正访问数据库时才读取配置，因此 `pnpm build` 不需要数据库连通性或数据库凭据。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PG_USER` | 无 | 必填；本地为 Compose 全能账号，生产由基础设施按迁移/运行阶段分别注入 |
| `PG_PWD` | 无 | 必填；本地复用同一凭据，生产按迁移/运行角色分别注入 |
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

### 文章专属资产存储

每篇文章拥有自己的资产集合，对象由文章生命周期控制。资产元数据保存在
`article_asset` 表中，通过 `article_id` 外键以 `ON DELETE cascade` 跟随文章
删除；Garage 中的对象由服务端在删除文章时按已记录的 `object_key` 批量清理。
当前阶段接受孤儿对象：若 Garage 对象删除失败只记录日志，不阻断数据库清理。

资产通过文章编辑页的资产面板上传，服务端先做文件签名校验（单文件上限
10 MiB，接受 JPEG、PNG、WebP、GIF、AVIF 与 PDF），再写入 Garage，最后落库；
对象键由服务端生成 `articles/<articleId>/<assetId>`，不使用原始文件名。
若 Garage 写入成功但落库失败，服务端会 best-effort 回滚已上传的对象。

文章正文通过稳定资产 UUID 使用 canonical Markdown 引用：图片为
`![alt](cq-asset://<asset-id>)`，PDF/文件为
`[label](cq-asset://<asset-id>)`。更新文章时，应用会在同一 PostgreSQL
事务中校验所有引用资产均存在且属于当前文章；过期 revision、无效引用或
不归属的资产不会部分更新文章。该引用当前只用于私有 Admin 写作数据，
不代表公开 URL，也不提供公开渲染。

本地 Compose 会从 `.env` 读取 `ARTICLE_S3_BUCKET`、
`ARTICLE_S3_ACCESS_KEY_ID` 和 `ARTICLE_S3_SECRET_ACCESS_KEY`，并幂等初始化桶与
写入密钥。`.env.example` 中的固定值仅适用于绑定到 loopback 的本地 Garage；
生产环境必须注入独立生成且只授权私有文章资产桶的凭据。浏览器和 API 响应均不得
暴露访问密钥、Secret 或 Garage endpoint。

> Garage 管理模块（bucket/key/object 的通用管理 UI）暂缓实现。

最终应用镜像包含经过 bundling 的迁移和账户初始化入口，不复制项目完整的 `node_modules`：

```bash
node runtime-tools/db/migrate.cjs
node runtime-tools/auth/bootstrap-user.cjs
```

迁移器只执行尚未记录的迁移。没有待执行迁移时正常退出，失败时以非零状态退出；它不会在镜像构建、应用启动或请求处理中自动运行。基础设施应在发布应用前，以同一镜像和迁移角色执行该入口。

### CI 校验边界

CI 会重新生成认证 schema 和 Drizzle migration，并通过 `git diff` 确认 `lib/db/schema.ts` 与 `drizzle/` 已提交且保持同步。`pnpm build` 同时生成最终镜像使用的迁移器和账户初始化 bundle。

常规 verify job 不连接 PostgreSQL，也不查询真实表结构、检查角色权限或模拟生产迁移。
独立的 Passkey E2E job 使用临时 PostgreSQL 服务和随机命名数据库，执行迁移、初始化测试账户，
再通过系统 Chrome 的 WebAuthn 虚拟验证器验证完整认证链路；测试结束后删除该数据库。
生产部署仍应在启动新版本应用前，使用基础设施提供的迁移凭据执行镜像内迁移入口。

## 当前认证边界

当前运行时提供认证 API、邮箱密码登录、受 Session 保护的账户页、
Passkey 登录与管理、TOTP 双因素认证、一次性恢复码和一次性首个账户初始化，
公开注册始终关闭。
`/account` 会查询 Session，并把未登录访问者重定向到 `/sign-in`。
`/admin/*` 在 Session 之外还会校验服务端持久化的 `role`；只有精确的
`admin` 值可以进入后台，未来普通用户默认使用 `user`，不会因已登录获得管理权限。
Passkey 注册与登录都要求验证器完成用户验证；Passkey 登录成功后不会再次进入
TOTP 流程。注册、重命名和移除只允许在最近 10 分钟内建立的 Session 中操作，
并且不能移除账户最后一个可用的登录方式。

## 常用校验

```bash
pnpm test
pnpm lint
pnpm build
git diff --check
```

完整 Passkey 浏览器测试还需要本地 PostgreSQL 和系统 Chrome。它会创建并清理独立数据库，
不会使用 `PG_DB` 指向的应用数据库：

```bash
pnpm test:e2e:passkey
```

## 认证运行时

认证运行时只会在 `/api/auth/*` 请求、`/account` 的 Session 查询和
`/admin/*` 的 Session/role 校验时初始化。
公开的 Home、Me、静态 Notes 详情和 `/sign-in` 的初始页面渲染不读取数据库
或认证密钥；登录表单提交会调用认证 API。

运行时除 PostgreSQL 变量外还需要：

| 环境变量 | 说明 |
| --- | --- |
| `BETTER_AUTH_URL` | 站点的公开 origin；生产环境必须使用 HTTPS，本机开发允许 `http://localhost` 或 `http://127.0.0.1` |
| `PASSKEY_RP_ID` | WebAuthn relying party ID；必须等于 `BETTER_AUTH_URL` 的 hostname 或其可注册父域，本机开发使用 `localhost` |
| `BETTER_AUTH_SECRETS` | 版本化密钥列表，例如 `2:<current-secret>,1:<previous-secret>`；每个密钥至少 32 个字符，首项用于新数据 |

Passkey ceremony 的 origin 固定为 `BETTER_AUTH_URL`，不会从请求头推导。部署域名变化时
必须同步审查 `BETTER_AUTH_URL` 与 `PASSKEY_RP_ID`，否则现有凭据可能无法使用。

公开注册始终关闭。首次账户由运维人员在应用镜像中通过一次性命令创建；姓名、邮箱和密码只从当前进程环境读取，命令不会输出这些值：

```bash
AUTH_BOOTSTRAP_NAME="CQ" \
AUTH_BOOTSTRAP_EMAIL="owner@example.com" \
AUTH_BOOTSTRAP_PASSWORD="<15-to-128-character-password>" \
node scripts/bootstrap-auth-user.mjs
```

该命令使用运行时 PostgreSQL 角色，创建的首个账户会持久化为 `admin`，密码通过 Better Auth 的默认 scrypt 实现散列。邮箱已存在时命令默认失败，不会覆盖既有账户。可重复执行的本地初始化可以额外设置 `AUTH_BOOTSTRAP_IF_MISSING=true`，此时同一邮箱已存在会作为成功跳过，其他错误仍会失败。
