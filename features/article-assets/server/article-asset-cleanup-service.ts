import "server-only";

import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import type { GarageObjectStore } from "@/lib/garage/garage-object-store";
import { getDatabase } from "@/lib/db/client";
import { maintenanceTask } from "@/lib/db/schema/maintenance-task";
import * as repository from "./article-asset-repository";
import { getArticleObjectStore } from "./article-storage-config";

export type ArticleAssetCleanupDependencies = Readonly<{
  store: GarageObjectStore;
}>;

function defaultDependencies(): ArticleAssetCleanupDependencies {
  return { store: getArticleObjectStore() };
}

export type ArticleAssetCleanupOptions = Readonly<{
  /** pending_delete 资产视为可清理前的最短停留时间，默认 24 小时。 */
  deleteGraceMs?: number;
  /** 单次运行最多处理的资产数量，默认 100。 */
  batchLimit?: number;
  /** 依赖注入（测试用）。 */
  dependencies?: ArticleAssetCleanupDependencies;
}>;

/**
 * 清理 Garage 无引用资源：
 *
 * `pending_delete` 资产：无引用资产，停留超过宽限期后删除 Garage 对象并标记为 `deleted`。
 *
 * 资源默认宽限期均为 24 小时，确保用户有充足的撤销窗口。
 * 对每个资产，先 更新 DB 状态为 `deleted`，再删除 Garage 对象（不处理失败情况）
 */
export async function cleanupArticleAssets(
  options: ArticleAssetCleanupOptions = {},
): Promise<void> {
  const success = await startMaintenanceTask();
  if (!success) {
    return;
  }
  const {
    deleteGraceMs = 24 * 60 * 60 * 1000,
    batchLimit = 100,
    dependencies = defaultDependencies(),
  } = options;

  const now = Date.now();

  const pendingDeleteCutoff = new Date(now - deleteGraceMs);

  const pendingDeleteAssets = await repository.markAssetsAsDeleted(
    pendingDeleteCutoff,
    batchLimit,
  );

  await dependencies.store.deleteBatch(
    pendingDeleteAssets.map((asset) => asset.objectKey),
  );
  await endMaintenanceTask();
}

/**
 * 尝试开启维护任务“article_asset_cleanup”
 * 如果当前请求获得 cleanup 执行权返回 true，否则返回 false。
 */
export async function startMaintenanceTask() {
  const [row] = await getDatabase()
    .update(maintenanceTask)
    .set({
      nextEligibleAt: sql`now() + interval '10 minutes'`,
      leaseUntil: sql`now() + interval '2 minutes'`,
      lastStartedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(maintenanceTask.key, "article_asset_cleanup"),
        lte(maintenanceTask.nextEligibleAt, sql`now()`),
        or(
          isNull(maintenanceTask.leaseUntil),
          lte(maintenanceTask.leaseUntil, sql`now()`),
        ),
      ),
    )
    .returning({ key: maintenanceTask.key });

  return row !== undefined;
}

export async function endMaintenanceTask() {
  await getDatabase()
    .update(maintenanceTask)
    .set({
      leaseUntil: null,
      updatedAt: sql`now()`,
    })
    .where(eq(maintenanceTask.key, "article_asset_cleanup"));
}
