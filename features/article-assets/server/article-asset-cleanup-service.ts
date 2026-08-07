import "server-only";

import type { GarageObjectStore } from "@/lib/garage/garage-object-store";
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
  const {
    pendingDeleteGraceMs = 24 * 60 * 60 * 1000,
    batchLimit = 100,
    dependencies = defaultDependencies(),
  } = options;

  const now = Date.now();

  const pendingDeleteCutoff = new Date(now - pendingDeleteGraceMs);

  const pendingDeleteAssets = await repository.markAssetsAsDeleted(
    pendingDeleteCutoff,
    batchLimit,
  );

  await dependencies.store.deleteBatch(
    pendingDeleteAssets.map((asset) => asset.objectKey),
  );
}
