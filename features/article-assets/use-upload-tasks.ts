"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  uploadTaskManager,
  type UploadTask,
} from "./upload-task-manager";

/**
 * 订阅全部上传任务。组件共享同一份模块级任务列表。
 */
export function useUploadTasks(): readonly UploadTask[] {
  return useSyncExternalStore(
    uploadTaskManager.subscribe,
    uploadTaskManager.getSnapshot,
    uploadTaskManager.getServerSnapshot,
  );
}

/**
 * 订阅单个上传任务。任务不存在时返回 undefined。
 */
export function useUploadTask(
  id: string | null,
): UploadTask | undefined {
  const getSnapshot = useCallback(
    () => (id ? uploadTaskManager.getTask(id) : undefined),
    [id],
  );
  return useSyncExternalStore(
    uploadTaskManager.subscribe,
    getSnapshot,
    getSnapshot,
  );
}

/**
 * 获取上传操作函数。所有函数引用稳定，可安全用于 effect 依赖。
 */
export function useUploadActions() {
  const enqueue = useCallback(
    (articleId: string, file: File) =>
      uploadTaskManager.enqueue(articleId, file),
    [],
  );
  const retry = useCallback(
    (taskId: string) => uploadTaskManager.retry(taskId),
    [],
  );
  const cancel = useCallback(
    (taskId: string) => uploadTaskManager.cancel(taskId),
    [],
  );
  const remove = useCallback(
    (taskId: string) => uploadTaskManager.remove(taskId),
    [],
  );
  const discard = useCallback(
    (taskId: string) => uploadTaskManager.discard(taskId),
    [],
  );
  const clearCompleted = useCallback(
    () => uploadTaskManager.clearCompleted(),
    [],
  );
  return { enqueue, retry, cancel, remove, discard, clearCompleted };
}
