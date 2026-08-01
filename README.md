# codebuff-next

CQ’s Lab 的 Next.js 应用，使用 App Router、TypeScript、Tailwind CSS、Better Auth、Drizzle ORM、PostgreSQL 与 Garage。公开内容统一称为 **Notes**；数据库与内部领域仍使用 `Article` 命名。

## 当前路由

| 路径 | 实现 |
| --- | --- |
| `/` | 站点简介与最多三篇已发布 Notes |
| `/notes` | 从 PostgreSQL 读取的已发布 Notes 索引 |
| `/notes/[noteId]` | 已发布 Note 详情；正文为数据库中的 Markdown |
| `/me` | About：公开的个人简介与工作方法 |
| `/sign-in` | 邮箱密码、Passkey、TOTP 与恢复码登录 |
| `/admin` | 需要 `admin` role 的后台入口，使用顶栏导航 |
| `/admin/articles` | 草稿与已发布内容管理 |
| `/admin/account` | 当前管理员的账户与安全设置 |
| `/editor/[articleId]` | 全屏 Markdown 编辑器 |
| `/api/auth/*` | Better Auth API |

旧的 `/articles`、`/articles/[articleId]` 与 `/article/[articleId]` 会永久重定向到 Notes 规范路由。仓库不再包含 MDX 内容或 MDX 构建管线。

## 本地开发

Compose 只提供 PostgreSQL 和 Garage；应用、迁移与首次账户初始化在宿主机显式运行：

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
docker compose -f docker-compose-dev.yml up --detach --wait
pnpm db:migrate
pnpm auth:bootstrap
pnpm dev
```

`pnpm auth:bootstrap` 仅用于首次创建本地管理员。日常开发只需启动基础设施与应用：

```powershell
docker compose -f docker-compose-dev.yml up --detach --wait
pnpm dev
```

本地环境刻意让 `PG_USER` 同时承担数据库 owner、应用与迁移账号，以降低开发成本；生产环境必须拆分最小权限角色。PostgreSQL 官方镜像只在数据卷为空时应用初始化账号。修改 `.env` 不会重写已有卷内角色与密码。

Garage 会幂等初始化 `.env` 指定的私有桶与应用写入密钥。`.env.example` 的固定凭据只适用于绑定 loopback 的本地环境；生产必须注入独立凭据，浏览器与 API 响应不得暴露访问密钥或 Garage endpoint。

## 数据库与迁移

数据库使用 Drizzle ORM、`pg` 连接池和 PostgreSQL 18。应用与迁移器只在真正访问数据库时读取配置，所以构建不要求数据库连通性。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PG_USER` | 无 | 必填；本地复用全能账号，生产按阶段注入 |
| `PG_PWD` | 无 | 必填；不得写入日志 |
| `PG_HOST` | `postgres` | 非生产环境可覆盖 |
| `PG_PORT` | `5432` | 非生产环境可覆盖 |
| `PG_DB` | `codebuff_next` | 非生产环境可覆盖 |
| `PG_POOL_MAX` | `5` | 应用连接池上限 |
| `PG_CONNECTION_TIMEOUT_MS` | `10000` | 连接超时，单位毫秒 |

认证 schema 与 SQL migration 都是版本化产物：

```bash
pnpm auth:schema
pnpm db:generate
pnpm db:migrate
```

提交结构变更时需共同审查 `lib/db/schema/`、`drizzle/*.sql` 与 `drizzle/meta/`。生产禁止使用 `drizzle-kit push`，迁移由镜像内的 `runtime-tools/db/migrate.cjs` 在应用切换前执行。

## Notes 与资产

编辑器把草稿标题与 Markdown 正文保存在数据库。图片引用为 `![alt](cq-asset://<asset-id>)`，文件引用为 `[label](cq-asset://<asset-id>)`。保存草稿时会校验正文引用的资产存在且属于当前文章；发布时会再次校验正文与封面资产，然后把当前草稿修订复制到公开槽位。

资产上传由服务端校验文件签名，单文件上限 10 MiB，接受 JPEG、PNG、WebP、GIF、AVIF 与 PDF。对象键由服务端生成，Garage 写入成功但数据库落库失败时会 best-effort 回滚。公开资产路由只为已发布 Note 提供其所属资产，不暴露存储凭据。

## 认证边界

公开注册始终关闭。首次账户通过 `pnpm auth:bootstrap` 创建并持久化为 `admin`。`/admin/*` 与 `/editor/*` 同时校验 Session 和服务端 role；只有精确的 `admin` 值可进入。

Passkey 注册与登录要求用户验证。密码登录可进入 TOTP/恢复码流程；Passkey 登录成功后不重复进入 TOTP。Passkey 管理要求最近 10 分钟内建立的 Session，且不能移除账户最后一个登录方式。

认证运行时需要：

| 环境变量 | 说明 |
| --- | --- |
| `BETTER_AUTH_URL` | 公开 origin；生产必须 HTTPS |
| `PASSKEY_RP_ID` | 必须等于公开 hostname 或其可注册父域 |
| `BETTER_AUTH_SECRETS` | 版本化密钥列表；首项写入新数据 |

Home 与 Notes 会查询 PostgreSQL；`/me` 与 `/sign-in` 的初始渲染不依赖数据库。认证 API、Admin、Editor 与账户设置会初始化认证运行时。

## 校验基线

```bash
pnpm lint
pnpm build
git diff --check
```

按照稳定化 Milestone 的 owner 决定，仓库当前不保留自动化测试，也不提供 `pnpm test`。新增功能仍处于暂停状态；当前 CI 只检查生成的数据库产物、lint、构建、镜像构建，以及无数据库凭据时 `/me` 与 `/sign-in` 的容器运行状态。
