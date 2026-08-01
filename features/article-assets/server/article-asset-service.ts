import "server-only";

import { randomUUID } from "node:crypto";

import type { GarageObjectStore } from "@/lib/garage/garage-object-store";
import type { ArticleAsset } from "../article-asset-dto";
import {
  ArticleNotFoundError,
  AssetNotFoundError,
  AssetStorageError,
} from "../article-asset-errors";
import { verifyAssetFile } from "../article-asset-file-validation";
import * as repository from "./article-asset-repository";
import { getArticleObjectStore } from "./article-storage-config";

export type ArticleAssetServiceDependencies = Readonly<{
  store: GarageObjectStore;
}>;

function defaultDependencies(): ArticleAssetServiceDependencies {
  return { store: getArticleObjectStore() };
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23503"
  );
}


export async function uploadArticleAsset(
  articleId: string,
  file: File,
  dependencies: ArticleAssetServiceDependencies = defaultDependencies(),
): Promise<ArticleAsset> {
  if (!(await repository.articleExists(articleId))) {
    throw new ArticleNotFoundError();
  }

  const verified = await verifyAssetFile(file);
  const id = randomUUID();
  const objectKey = `articles/${articleId}/${id}`;

  try {
    await dependencies.store.put({
      body: verified.body,
      byteSize: verified.byteSize,
      mediaType: verified.mediaType,
      objectKey,
      sha256: verified.sha256,
    });
  } catch (error) {
    console.error("Failed to write article asset object.", {
      articleId,
      assetId: id,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    throw new AssetStorageError();
  }

  try {
    return await repository.createAsset({
      articleId,
      byteSize: verified.byteSize,
      id,
      mediaType: verified.mediaType,
      objectKey,
      originalFilename: verified.originalFilename,
      sha256: verified.sha256,
    });
  } catch (error) {
    // 文章在上传过程中被删除（TOCTOU）：FK violation → 准确的错误反馈
    if (isForeignKeyViolation(error)) {
      try {
        await dependencies.store.delete(objectKey);
      } catch (rollbackError) {
        console.error("Failed to roll back orphaned article asset object.", {
          articleId,
          assetId: id,
          objectKey,
          cause:
            rollbackError instanceof Error
              ? rollbackError.name
              : "UnknownError",
        });
      }

      throw new ArticleNotFoundError();
    }

    console.error("Failed to persist article asset after object upload.", {
      articleId,
      assetId: id,
      objectKey,
      cause: error instanceof Error ? error.name : "UnknownError",
    });

    // Best-effort rollback: 删除已上传但未能落库的孤儿对象。
    // 失败只记日志，符合"接受孤儿"底线；此处至少把常见失败（FK 违反、
    // DB 连接断开等）产生的对象回收掉。
    try {
      await dependencies.store.delete(objectKey);
    } catch (rollbackError) {
      console.error("Failed to roll back orphaned article asset object.", {
        articleId,
        assetId: id,
        objectKey,
        cause:
          rollbackError instanceof Error ? rollbackError.name : "UnknownError",
      });
    }

    throw error;
  }
}

export async function readArticleAsset(
  articleId: string,
  assetId: string,
  dependencies: ArticleAssetServiceDependencies = defaultDependencies(),
): Promise<Readonly<{ asset: ArticleAsset; body: Uint8Array }>> {
  const asset = await repository.findAssetById(articleId, assetId);

  if (!asset) {
    throw new AssetNotFoundError();
  }

  try {
    return {
      asset,
      body: await dependencies.store.get(asset.objectKey),
    };
  } catch {
    throw new AssetStorageError();
  }
}

export async function deleteArticleAsset(
  articleId: string,
  assetId: string,
  dependencies: ArticleAssetServiceDependencies = defaultDependencies(),
): Promise<void> {
  const deleted = await repository.deleteAssetById(articleId, assetId);

  if (!deleted) {
    throw new AssetNotFoundError();
  }

  try {
    await dependencies.store.delete(deleted.objectKey);
  } catch (error) {
    console.error("Failed to delete article asset object after metadata removal.", {
      articleId,
      assetId,
      cause: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export function listArticleAssets(articleId: string) {
  return repository.listAssetsByArticle(articleId);
}
