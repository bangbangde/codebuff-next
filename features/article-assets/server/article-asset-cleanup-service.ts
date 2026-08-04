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
  temporaryProcessed: number;
  temporarySucceeded: number;
  temporaryFailed: number;
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
  );
  const temporaryResult = await processBatch(
    temporaryAssets,
    dependencies.store,
  );

  return {
    pendingDeleteProcessed: pendingDeleteResult.processed,
    pendingDeleteSucceeded: pendingDeleteResult.succeeded,
    pendingDeleteFailed: pendingDeleteResult.failed,
    temporaryProcessed: temporaryResult.processed,
    temporarySucceeded: temporaryResult.succeeded,
    temporaryFailed: temporaryResult.failed,
  };
}

async function processBatch(
  assets: readonly ArticleAsset[],
  store: GarageObjectStore,
): Promise<{ processed: number; succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const asset of assets) {
    try {
      await store.delete(asset.objectKey);
      await repository.markAssetAsDeleted(asset.id);
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

  return { processed: assets.length, succeeded, failed };
}
