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
  /** pending_delete 资产视为可清理前的最短停留时间，默认 24 小时。 */
  pendingDeleteGraceMs?: number;
  /** temporary 资产视为孤儿前的最短停留时间，默认 24 小时。 */
  temporaryGraceMs?: number;
  /** 单次运行最多处理的资产数量，默认 100。 */
  batchLimit?: number;
  /** deleting 资产视为 stale 的阈值，默认 15 分钟。
   *  超过此时间的 deleting 资产视为进程中断的残留，重新尝试删除或回退。 */
  staleDeletingGraceMs?: number;
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
  staleDeletingProcessed: number;
  staleDeletingSucceeded: number;
  staleDeletingFailed: number;
  staleDeletingReverted: number;
}>;

/**
 * 清理 Garage 临时资源和孤儿资源：
 *
 * 1. `pending_delete` 资产：引用已被移除，停留超过宽限期后删除 Garage 对象并标记为 `deleted`。
 * 2. `temporary` 资产：上传后超过宽限期仍未被引用，视为孤儿，同样清理。
 * 3. `deleting` 资产（stale claim 恢复）：进程中断导致停留在 `deleting`
 *    超过阈值（默认 15 分钟）的资产，重新尝试删除 Garage 对象
 *    （幂等），成功后标记为 `deleted`；失败时回退为 `pending_delete` 等待下次重试。
 *
 * 两类常规资源默认宽限期均为 24 小时，确保用户有充足的撤销窗口。
 * 对每个资产，先 claim（基于数据库状态重新确认仍可清理），再删除 Garage 对象
 * （幂等），成功后更新 DB 状态为 `deleted`。Garage 删除失败的资产跳过，
 * 等待下一次运行重试。清理动作幂等，单次限量，失败只会延迟回收。
 */
export async function cleanupArticleAssets(
  options: ArticleAssetCleanupOptions = {},
): Promise<ArticleAssetCleanupSummary> {
  const {
    pendingDeleteGraceMs = 24 * 60 * 60 * 1000,
    temporaryGraceMs = 24 * 60 * 60 * 1000,
    batchLimit = 100,
    staleDeletingGraceMs = 15 * 60 * 1000,
    dependencies = defaultDependencies(),
  } = options;

  const now = Date.now();

  const pendingDeleteCutoff = new Date(now - pendingDeleteGraceMs);
  const temporaryCutoff = new Date(now - temporaryGraceMs);
  const staleDeletingCutoff = new Date(now - staleDeletingGraceMs);

  const [pendingDeleteAssets, temporaryAssets, staleDeletingAssets] =
    await Promise.all([
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
      repository.listStaleDeletingAssets(staleDeletingCutoff, batchLimit),
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
  const staleDeletingResult = await processStaleDeletingBatch(
    staleDeletingAssets,
    dependencies.store,
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
    staleDeletingProcessed: staleDeletingResult.processed,
    staleDeletingSucceeded: staleDeletingResult.succeeded,
    staleDeletingFailed: staleDeletingResult.failed,
    staleDeletingReverted: staleDeletingResult.reverted,
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
      // claim 成 `deleting` 独占态：保存/发布事务无法再将该资产复活为 active，
      // 避免删除 Garage 对象后正文仍引用的 TOCTOU。若 claim 返回 null，
      // 说明状态已变更（被引用方复活），跳过本次删除。
      const claimed = await repository.claimAssetForDeletion(asset.id, expectedStatuses);
      if (!claimed) {
        skipped += 1;
        continue;
      }

      try {
        await store.delete(asset.objectKey);
      } catch (deleteError) {
        // Garage 删除失败：回退 claim（deleting → pending_delete），下次重试。
        await repository.releaseAssetClaim(asset.id);
        throw deleteError;
      }

      const marked = await repository.markAssetAsDeleted(asset.id);
      if (!marked) {
        // claim 成功但 mark 时状态已不在 deleting（理论上的并发边界），跳过。
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

/**
 * 处理 stale `deleting` 资产（进程中断后的残留恢复）。
 *
 * 这些资产已被 claim 为 `deleting` 但未完成 Garage 删除或最终状态更新。
 * 直接重新尝试删除 Garage 对象（幂等），成功后标记为 `deleted`；
 * 删除失败时回退为 `pending_delete`，等待下次 cleanup 正常流程处理。
 */
async function processStaleDeletingBatch(
  assets: readonly ArticleAsset[],
  store: GarageObjectStore,
): Promise<{ processed: number; succeeded: number; failed: number; reverted: number }> {
  let succeeded = 0;
  let failed = 0;
  let reverted = 0;

  for (const asset of assets) {
    try {
      // 幂等重试删除：S3/Garage DeleteObject 对不存在的对象也返回成功
      await store.delete(asset.objectKey);

      const marked = await repository.markAssetAsDeleted(asset.id);
      if (!marked) {
        // 状态已不在 deleting（被其他流程变更），跳过
        failed += 1;
        continue;
      }
      succeeded += 1;
    } catch (error) {
      // Garage 删除仍失败：回退为 pending_delete，等下次 cleanup 重试
      await repository.releaseAssetClaim(asset.id);
      reverted += 1;
      console.error("Failed to recover stale deleting article asset.", {
        assetId: asset.id,
        articleId: asset.articleId,
        objectKey: asset.objectKey,
        cause: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  return { processed: assets.length, succeeded, failed, reverted };
}
