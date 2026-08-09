# codebuff-next

CQ’s Lab 的 Next.js 应用，使用 App Router、TypeScript、Tailwind CSS、Better Auth、Drizzle ORM、PostgreSQL 与 Garage。公开内容统一称为 **Notes**；数据库与内部领域仍使用 `Article` 命名。

## 当前路由

| 路径 | 实现 |
| --- | --- |
| `/` | 个人主页与内容入口：Hero、Now、最新一篇 Note 与 About |
| `/notes` | 从 PostgreSQL 读取的已发布 Notes 索引 |
| `/notes/[noteId]` | 已发布 Note 详情；正文为数据库中的 Markdown |
| `/me` | 永久重定向到首页 About 区域 |
| `/sign-in` | 邮箱密码、Passkey、TOTP 与恢复码登录 |
| `/admin` | 永久重定向到 Notes 后台入口 |
| `/admin/notes` | 草稿与已发布 Notes 管理 |
| `/admin/notes/[noteId]` | 全屏 Markdown 编辑器 |
| `/admin/account` | 当前管理员的账户与安全设置 |
| `/api/auth/*` | Better Auth API |

仓库不保留旧内容页面、重定向或资产 API；公开站点与 Admin 只提供 Notes 路由。仓库不再包含 MDX 内容或 MDX 构建管线。

## 本地开发

仓库为每个 checkout 或 Git worktree 生成独立的 Compose project、端口、PostgreSQL 数据卷和 Garage 数据卷。首次使用只需：

```powershell
pnpm install --frozen-lockfile
pnpm local:bootstrap
pnpm local:dev
```

`local:bootstrap` 会生成被 Git 忽略的 `.dev/` 实例配置，启动并等待 PostgreSQL/Garage，执行完整 migration，并幂等初始化本地管理员。重复执行是安全的。

Next.js 默认在宿主机运行，以避免 Windows/macOS Docker 文件系统对 HMR 的影响。需要完整容器环境时使用：

```powershell
pnpm local:container:dev
```

完整命令、运行模式、诊断和清理说明见 [`docs/local-development.md`](docs/local-development.md)。`.env.runtime.example` 与 `.env.dev.example` 只作为手工配置和变量参考；正常 worktree 流程不复制 `.env` 文件。

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

编辑器把草稿标题与 Markdown 正文保存在数据库。图片引用为 `![alt](cq-asset://<asset-id>)`，文件引用为 `[label](cq-asset://<asset-id>)`。保存草稿时会校验正文引用的资产存在且属于当前笔记；发布时会再次校验正文与封面资产，然后把当前草稿修订复制到公开槽位。

资产上传由服务端校验文件签名，单文件上限 10 MiB，接受 JPEG、PNG、WebP、GIF、AVIF 与 PDF。对象键由服务端生成，Garage 写入成功但数据库落库失败时会 best-effort 回滚。公开资产路由只为已发布 Note 提供其所属资产，不暴露存储凭据。

对象存储运行时需要：

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OBJECT_STORAGE_ENDPOINT` | 无 | 必填；服务端可访问的绝对 URL |
| `OBJECT_STORAGE_REGION` | `garage` | S3 兼容区域标识 |
| `OBJECT_STORAGE_BUCKET` | 无 | 必填；私有应用资产桶 |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | 无 | 必填；最小权限访问密钥 |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | 无 | 必填；不得写入日志或响应 |

迁移期间应用仍兼容对应的 `ARTICLE_S3_*` 旧变量；新配置只应使用 `OBJECT_STORAGE_*`。实体 Bucket 不随变量改名而自动迁移。

## 认证边界

公开注册始终关闭。首次账户通过 `pnpm auth:bootstrap` 创建并持久化为 `admin`。`/admin/*` 会校验 Session 和服务端 role；只有精确的 `admin` 值可进入。

Passkey 注册与登录要求用户验证。密码登录可进入 TOTP/恢复码流程；Passkey 登录成功后不重复进入 TOTP。Passkey 管理要求最近 10 分钟内建立的 Session，且不能移除账户最后一个登录方式。

认证运行时需要：

| 环境变量 | 说明 |
| --- | --- |
| `BETTER_AUTH_URL` | 公开 origin；生产必须 HTTPS |
| `PASSKEY_RP_ID` | 必须等于公开 hostname 或其可注册父域 |
| `BETTER_AUTH_SECRETS` | 版本化密钥列表；首项写入新数据 |

Home 与 Notes 会查询 PostgreSQL；`/me` 只执行静态重定向，`/sign-in` 的初始渲染不依赖数据库。认证 API、Admin Notes 编辑器与账户设置会初始化认证运行时。

## 校验基线

```bash
pnpm lint
pnpm build
git diff --check
```

仓库当前不保留自动化测试，也不提供 `pnpm test`。当前 CI 检查生成的数据库产物、lint、构建、镜像构建，以及无数据库凭据时 `/me` 与 `/sign-in` 的容器运行状态。
