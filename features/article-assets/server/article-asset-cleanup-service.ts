import "server-only";

import type { GarageObjectStore } from "@/lib/garage/garage-object-store";
import type { ArticleAsset } from "../article-asset-dto";
import * as repository from "./article-asset-repository";
import { getArticleObjectStore } from "./article-storage-config";

export type ArticleAssetCleanupDependencies = Readonly<{
  store: GarageObjectStore;
}>;

function defaultDependencies(): ArticleAssetCleanupDependencies {
  return { store: getArticleObjectStore() };
}

export type ArticleAssetCleanupOptions = Readonly<{
  /** pending_delete 资产视为可清理前的最短停留时间，默认 0（立即清理）。 */
  pendingDeleteGraceMs?: number;
  /** temporary 资产视为孤儿前的最短停留时间，默认 24 小时。 */
  temporaryGraceMs?: number;
  /** 单次运行最多处理的资产数量，默认 100。 */
  batchLimit?: number;
  /** 依赖注入（测试用）。 */
  dependencies?: ArticleAssetCleanupDependencies;
}>;

export type ArticleAssetCleanupSummary = Readonly<{
  pendingDeleteProcessed: number;
  pendingDeleteSucceeded: number;
  pendingDeleteFailed: number;
  pendingDeleteSkipped: number;
  temporaryProcessed: number;
  temporarySucceeded: number;
  temporaryFailed: number;
  temporarySkipped: number;
}>;

/**
 * 清理 Garage 临时资源和孤儿资源：
 *
 * 1. `pending_delete` 资产：引用已被移除，安全删除 Garage 对象并标记为 `deleted`。
 * 2. `temporary` 资产：上传后超过宽限期仍未被引用，视为孤儿，同样清理。
 *
 * 对每个资产，先删除 Garage 对象（幂等），成功后再更新 DB 状态为 `deleted`。
 * Garage 删除失败的资产跳过，等待下一次运行重试。
 */
export async function cleanupArticleAssets(
  options: ArticleAssetCleanupOptions = {},
): Promise<ArticleAssetCleanupSummary> {
  const {
    pendingDeleteGraceMs = 0,
    temporaryGraceMs = 24 * 60 * 60 * 1000,
    batchLimit = 100,
    dependencies = defaultDependencies(),
  } = options;

  const now = Date.now();

  const pendingDeleteCutoff = new Date(now - pendingDeleteGraceMs);
  const temporaryCutoff = new Date(now - temporaryGraceMs);

  const [pendingDeleteAssets, temporaryAssets] = await Promise.all([
    repository.listAssetsPendingCleanup(
      ["pending_delete"],
      pendingDeleteCutoff,
      batchLimit,
    ),
    repository.listAssetsPendingCleanup(
      ["temporary"],
      temporaryCutoff,
      batchLimit,
    ),
  ]);

  const pendingDeleteResult = await processBatch(
    pendingDeleteAssets,
    dependencies.store,
    ["pending_delete"],
  );
  const temporaryResult = await processBatch(
    temporaryAssets,
    dependencies.store,
    ["temporary"],
  );

  return {
    pendingDeleteProcessed: pendingDeleteResult.processed,
    pendingDeleteSucceeded: pendingDeleteResult.succeeded,
    pendingDeleteFailed: pendingDeleteResult.failed,
    pendingDeleteSkipped: pendingDeleteResult.skipped,
    temporaryProcessed: temporaryResult.processed,
    temporarySucceeded: temporaryResult.succeeded,
    temporaryFailed: temporaryResult.failed,
    temporarySkipped: temporaryResult.skipped,
  };
}

async function processBatch(
  assets: readonly ArticleAsset[],
  store: GarageObjectStore,
  expectedStatuses: readonly ("pending_delete" | "temporary")[],
): Promise<{ processed: number; succeeded: number; failed: number; skipped: number }> {
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const asset of assets) {
    try {
      // 在删除 Garage 对象前先 claim：若其他事务在此期间将资产复活
      // 为 active（例如用户保存/发布文章时 syncAssetStatuses），
      // claimAssetForDeletion 会返回 null，此处跳过，不再删除对象。
      const claimed = await repository.claimAssetForDeletion(asset.id, expectedStatuses);
      if (!claimed) {
        skipped += 1;
        continue;
      }

      await store.delete(asset.objectKey);
      const marked = await repository.markAssetAsDeleted(asset.id);
      if (!marked) {
        // claim 成功但 mark 删除时状态被其他事务变更，保留已被复活
        skipped += 1;
        continue;
      }
      succeeded += 1;
    } catch (error) {
      failed += 1;
      console.error("Failed to cleanup article asset.", {
        assetId: asset.id,
        articleId: asset.articleId,
        objectKey: asset.objectKey,
        status: asset.status,
        cause: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return { processed: assets.length, succeeded, failed, skipped };
}
