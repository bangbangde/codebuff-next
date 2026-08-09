# 环境变量与部署配置

本文档定义本地开发、生产应用和一次性部署任务的环境变量边界。除本地开发 CLI 明确管理的 `.dev/environment.env` 外，应用与部署命令只读取启动进程已经持有的环境变量，不会自动加载 `.env`、`.env.local` 或 `.env.dev`。生产凭据应由部署平台或 Secret Manager 注入，不应存放在仓库、镜像、Issue、PR 或日志中。

## 本地开发

本地开发不需要手工提供下文中的业务环境变量。首次运行：

```powershell
pnpm local:bootstrap
```

本地开发 CLI 会为当前 checkout 或 Git worktree 生成：

- `.dev/instance.json`：实例身份、独立端口和本地凭据；
- `.dev/environment.env`：供 Compose 和本地子进程使用的渲染结果。

这两个文件都被 Git 忽略。不要手工编辑、提交或复制到其他 worktree；再次运行 `pnpm local:bootstrap` 会按当前实例状态重新生成环境文件。完整生命周期命令见 [`local-development.md`](local-development.md)。

本地 CLI 自动管理以下几类变量：

| 类别 | 变量 |
| --- | --- |
| 实例与端口 | `DEV_INSTANCE_ID`、`COMPOSE_PROJECT_NAME`、`APP_PORT`、`PORT`、`DEV_POSTGRES_PORT`、`DEV_GARAGE_S3_PORT`、`DEV_GARAGE_RPC_PORT`、`DEV_GARAGE_WEB_PORT`、`DEV_GARAGE_ADMIN_PORT` |
| 本地基础设施 | `DEV_POSTGRES_USER`、`DEV_POSTGRES_PASSWORD`、`DEV_POSTGRES_DB`、`GARAGE_ADMIN_ENDPOINT`、`GARAGE_ADMIN_TOKEN` |
| 应用与部署任务 | 下文的 `PG_*`、认证、对象存储和管理员引导变量 |

`GARAGE_ADMIN_TOKEN` 只会传给 Compose 中的 Garage 服务和一次性部署进程；app 容器只接收对象存储运行时凭据。

## 生产环境的进程边界

生产环境至少应区分以下凭据消费者：

| 消费者 | 应提供 | 不应提供 |
| --- | --- | --- |
| 常驻应用 | 数据库运行时变量、认证变量、对象存储运行时变量 | `GARAGE_ADMIN_TOKEN`、`AUTH_BOOTSTRAP_PASSWORD` |
| `prepare` 部署任务 | 数据库连接变量、Garage 初始化变量 | 认证运行时密钥、管理员引导密码 |
| `auth:bootstrap` 引导任务 | 数据库连接变量、`AUTH_BOOTSTRAP_*` | Garage Admin token、对象存储 secret |

构建镜像或执行 `pnpm build` 不需要生产数据库或生产密钥。部署任务与常驻应用可以使用同一镜像，但必须分别注入最小变量集合。

## 数据库变量

| 变量 | 必填 | 默认值 | 敏感 | 说明 |
| --- | --- | --- | --- | --- |
| `PG_USER` | 是 | 无 | 否 | PostgreSQL 用户名；生产环境可为应用与迁移任务配置不同账号 |
| `PG_PWD` | 是 | 无 | 是 | PostgreSQL 密码 |
| `PG_HOST` | 否 | `postgres` | 否 | PostgreSQL hostname 或 IP |
| `PG_PORT` | 否 | `5432` | 否 | 正整数端口 |
| `PG_DB` | 否 | `codebuff_next` | 否 | 数据库名 |
| `PG_POOL_MAX` | 否 | `5` | 否 | 常驻应用连接池上限；迁移任务固定使用单连接 |
| `PG_CONNECTION_TIMEOUT_MS` | 否 | `10000` | 否 | 正整数连接超时，单位毫秒 |

当前代码支持为应用和部署任务注入不同的 `PG_USER`/`PG_PWD`。迁移账号必须拥有执行版本化 Drizzle migration 所需权限；常驻应用账号只需业务运行权限。

## 认证运行时变量

这些变量只属于常驻应用：

| 变量 | 必填 | 敏感 | 说明 |
| --- | --- | --- | --- |
| `BETTER_AUTH_URL` | 是 | 否 | 应用公开 origin；生产必须为 HTTPS，不能包含路径、查询参数或用户信息 |
| `PASSKEY_RP_ID` | 是 | 否 | 必须等于公开 hostname 或其可注册父域 |
| `BETTER_AUTH_SECRETS` | 是 | 是 | 逗号分隔的 `版本:密钥` 列表，例如 `1:<secret>,0:<old-secret>`；版本必须唯一，密钥至少 32 个字符，首项用于写入新数据 |

轮换 `BETTER_AUTH_SECRETS` 时先把新版本放到首项并保留仍需读取的旧版本，确认旧数据不再依赖后再移除旧密钥。

## 对象存储运行时变量

这些变量提供给常驻应用：

| 变量 | 必填 | 默认值 | 敏感 | 说明 |
| --- | --- | --- | --- | --- |
| `OBJECT_STORAGE_ENDPOINT` | 是 | 无 | 否 | 应用可访问的 S3 兼容服务绝对 URL |
| `OBJECT_STORAGE_REGION` | 否 | `garage` | 否 | S3 兼容区域标识 |
| `OBJECT_STORAGE_BUCKET` | 是 | 无 | 否 | 私有业务 Bucket；所需 Bucket 在 `lib/object-storage/schema.mjs` 声明 |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | 是 | 无 | 否 | 最小权限运行时 Key ID |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | 是 | 无 | 是 | 运行时 Key secret |

生产应用的运行时 Key 只应拥有业务 Bucket 的 read/write 权限，不应拥有 `createBucket`、owner 或 Garage 管理权限。

应用暂时兼容 `ARTICLE_S3_ENDPOINT`、`ARTICLE_S3_REGION`、`ARTICLE_S3_BUCKET`、`ARTICLE_S3_ACCESS_KEY_ID` 和 `ARTICLE_S3_SECRET_ACCESS_KEY` 旧变量。部署脚本不读取这些旧名称；新部署只应配置 `OBJECT_STORAGE_*`。

## Garage 初始化变量

这些变量只提供给一次性 `prepare` 或 `garage:initialize` 部署任务：

| 变量 | 必填 | 敏感 | 说明 |
| --- | --- | --- | --- |
| `GARAGE_ADMIN_ENDPOINT` | 是 | 否 | 受限私有网络中的 Garage Admin API 绝对 URL；可提供 origin 或以 `/v1` 结尾 |
| `GARAGE_ADMIN_TOKEN` | 是 | 是 | Garage Admin API Bearer token，必须与独立 Garage 服务的 Admin API 配置一致；不得注入常驻应用 |
| `OBJECT_STORAGE_BUCKET` | 是 | 否 | 要幂等创建和授权的业务 Bucket |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | 是 | 否 | 外部部署系统持有的固定 Garage Key ID，格式为 `GK` 加小写十六进制字符 |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | 是 | 是 | 与 Key ID 配套的 64 位小写十六进制 secret |

初始化器会在 Key 不存在时通过 Admin API 导入固定凭据；Key 已存在时只校验 secret，不会覆盖。随后它会创建缺失的业务 Bucket，并将运行时 Key 权限收敛为 read/write，同时禁止 `createBucket` 和 owner。不要跨 Garage 集群复用同一组 Key，也不要把 ImportKey 当成任意 ID 生成器。

轮换运行时 Key 时应生成一组新的 ID/secret，执行 `garage:initialize` 导入并授权，再切换常驻应用，最后在 Garage 中撤销旧 Key。不要尝试修改已有 ID 对应的 secret。

## 管理员引导变量

这些变量只提供给一次性 `auth:bootstrap` 任务；该任务还需要数据库连接变量：

| 变量 | 必填 | 默认值 | 敏感 | 说明 |
| --- | --- | --- | --- | --- |
| `AUTH_BOOTSTRAP_NAME` | 是 | 无 | 否 | 管理员显示名称，最多 100 个字符 |
| `AUTH_BOOTSTRAP_EMAIL` | 是 | 无 | 否 | 管理员登录邮箱，最多 320 个字符 |
| `AUTH_BOOTSTRAP_PASSWORD` | 是 | 无 | 是 | 初始密码，长度为 15–128 个字符 |
| `AUTH_BOOTSTRAP_IF_MISSING` | 否 | `false` | 否 | 只能为 `true` 或 `false`；为 `true` 时已存在同邮箱账号会幂等跳过 |

管理员创建成功后，应从后续常规部署任务中移除 `AUTH_BOOTSTRAP_*`，并按运营流程轮换初始密码。

## 部署命令变量矩阵

先构建统一部署入口：

```bash
pnpm build:scripts
```

命令直接继承当前进程环境：

| 命令 | 必填变量 | 可选连接变量 |
| --- | --- | --- |
| `node .build/deploy.mjs prepare` | `PG_USER`、`PG_PWD`、`GARAGE_ADMIN_ENDPOINT`、`GARAGE_ADMIN_TOKEN`、`OBJECT_STORAGE_BUCKET`、`OBJECT_STORAGE_ACCESS_KEY_ID`、`OBJECT_STORAGE_SECRET_ACCESS_KEY` | `PG_HOST`、`PG_PORT`、`PG_DB`、`PG_CONNECTION_TIMEOUT_MS` |
| `node .build/deploy.mjs migrate` | `PG_USER`、`PG_PWD` | `PG_HOST`、`PG_PORT`、`PG_DB`、`PG_CONNECTION_TIMEOUT_MS` |
| `node .build/deploy.mjs garage:initialize` | `GARAGE_ADMIN_ENDPOINT`、`GARAGE_ADMIN_TOKEN`、`OBJECT_STORAGE_BUCKET`、`OBJECT_STORAGE_ACCESS_KEY_ID`、`OBJECT_STORAGE_SECRET_ACCESS_KEY` | 无 |
| `node .build/deploy.mjs auth:bootstrap` | `PG_USER`、`PG_PWD`、`AUTH_BOOTSTRAP_NAME`、`AUTH_BOOTSTRAP_EMAIL`、`AUTH_BOOTSTRAP_PASSWORD` | `PG_HOST`、`PG_PORT`、`PG_DB`、`PG_CONNECTION_TIMEOUT_MS`、`AUTH_BOOTSTRAP_IF_MISSING` |

推荐的生产顺序：

1. 无凭据构建并发布不可变镜像；
2. 运行 `prepare` 完成数据库 migration、Garage Key 导入、Bucket 创建和权限收敛；
3. 仅向常驻应用注入数据库运行时、认证和对象存储运行时变量；
4. 只在首次建站或明确的账户恢复流程中单独运行 `auth:bootstrap`。
