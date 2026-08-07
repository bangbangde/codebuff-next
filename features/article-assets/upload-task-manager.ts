// 统一资源上传核心模块（框架无关）
//
// 职责：
// - 创建上传任务并生成任务 ID
// - 客户端文件校验（即时反馈，避免无效往返）
// - 调用上传接口（XHR，支持真实进度与取消）
// - 上传进度管理
// - 失败自动重试（可配置最大次数）
// - 取消上传（AbortController）
// - 返回最终资源信息
//
// 采用模块级 store + useSyncExternalStore 模式（与项目既有约定一致），
// 不引入外部状态库。所有组件共享同一份任务列表。

import {
  acceptedAssetTypes,
  maximumAssetBytes,
  type AcceptedAssetType,
  type ArticleAsset,
} from "./article-asset-dto";

// ─── 任务类型 ───────────────────────────────────────────────

export type UploadTaskStatus =
  | "pending"
  | "uploading"
  | "retrying"
  | "success"
  | "error"
  | "canceled";

export type UploadTask = Readonly<{
  id: string;
  articleId: string;
  filename: string;
  byteSize: number;
  /** 浏览器报告的 MIME 类型，仅用于显示；引用插入应使用 asset.mediaType */
  mediaType: string;
  status: UploadTaskStatus;
  /** 0-100，已上传百分比 */
  progress: number;
  /** 当前尝试次数（1 基） */
  attempt: number;
  maxAttempts: number;
  error: string | null;
  asset: ArticleAsset | null;
  createdAt: number;
  completedAt: number | null;
}>;

// ─── 客户端文件校验 ─────────────────────────────────────────

const acceptedTypeSet = new Set<string>(acceptedAssetTypes);

const extensionsByMediaType: Record<AcceptedAssetType, readonly string[]> = {
  "application/pdf": [".pdf"],
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

// 浏览器偶尔发送非标准 MIME（如 image/jpg），归一化后再比较
const mimeTypeAliases: Record<string, string> = {
  "image/jpg": "image/jpeg",
};

function normalizeMimeType(type: string): string {
  return mimeTypeAliases[type] ?? type;
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export type ClientValidationResult =
  | { ok: true; mediaType: AcceptedAssetType }
  | { ok: false; error: string };

export function validateAssetFileClientSide(
  file: File,
): ClientValidationResult {
  if (file.size === 0) {
    return { ok: false, error: "文件为空。" };
  }

  if (file.size > maximumAssetBytes) {
    return {
      ok: false,
      error: `文件不能超过 ${maximumAssetBytes / (1024 * 1024)} MiB。`,
    };
  }

  const filename = file.name.normalize("NFC");
  if (
    !filename ||
    filename.length > 255 ||
    filename.includes("\0") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return { ok: false, error: "文件名无效。" };
  }

  const normalizedType = normalizeMimeType(file.type);
  if (!acceptedTypeSet.has(normalizedType)) {
    return { ok: false, error: "不支持的文件类型。" };
  }

  const mediaType = normalizedType as AcceptedAssetType;
  const extension = getExtension(filename);
  if (!extensionsByMediaType[mediaType].includes(extension)) {
    return { ok: false, error: "文件扩展名与类型不匹配。" };
  }

  return { ok: true, mediaType };
}

// ─── 上传错误 ───────────────────────────────────────────────

class UploadNetworkError extends Error {
  readonly retryable = true;
  constructor(message = "网络错误，请检查连接后重试。") {
    super(message);
    this.name = "UploadNetworkError";
  }
}

class UploadResponseError extends Error {
  readonly retryable: boolean;
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "UploadResponseError";
    this.status = status;
    this.retryable = status >= 500;
  }
}

class UploadAbortError extends Error {
  readonly retryable = false;
  constructor(message = "上传已取消。") {
    super(message);
    this.name = "UploadAbortError";
  }
}

// ─── XHR 上传（支持进度与取消） ─────────────────────────────

function uploadFileViaXhr(
  url: string,
  file: File,
  articleId: string,
  onProgress: (loaded: number, total: number) => void,
  signal: AbortSignal,
): Promise<ArticleAsset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("articleId", articleId);
    formData.append("file", file);

    xhr.open("POST", url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            asset?: ArticleAsset;
            error?: string;
          };
          if (data.asset) {
            resolve(data.asset);
          } else {
            reject(
              new UploadResponseError(data.error ?? "上传失败。", xhr.status),
            );
          }
        } catch {
          reject(new UploadResponseError("响应解析失败。", xhr.status));
        }
      } else {
        let message = "上传失败。";
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          if (data.error) {
            message = data.error;
          }
        } catch {
          // 响应体非 JSON，使用默认消息
        }
        reject(new UploadResponseError(message, xhr.status));
      }
    };

    xhr.onerror = () => reject(new UploadNetworkError());
    xhr.onabort = () => reject(new UploadAbortError());

    signal.addEventListener("abort", () => xhr.abort());
    xhr.send(formData);
  });
}

// ─── 任务管理器 ─────────────────────────────────────────────

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_CONCURRENCY = 3;
const RETRY_DELAY_MS = 1000;

type TaskEntry = {
  snapshot: UploadTask;
  file: File;
  controller: AbortController | null;
  running: boolean;
};

const EMPTY_ARRAY: readonly UploadTask[] = [];

const entries = new Map<string, TaskEntry>();
const listeners = new Set<() => void>();
let cachedSnapshot: readonly UploadTask[] = EMPTY_ARRAY;
let activeUploads = 0;
const concurrency = DEFAULT_CONCURRENCY;

function generateTaskId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function emit() {
  cachedSnapshot = Array.from(entries.values()).map((e) => e.snapshot);
  listeners.forEach((l) => l());
}

function updateTask(id: string, updates: Partial<UploadTask>) {
  const entry = entries.get(id);
  if (!entry) {
    return;
  }
  entry.snapshot = { ...entry.snapshot, ...updates };
  emit();
}

function buildUploadUrl(articleId: string): string {
  return `/api/admin/notes/${articleId}/assets`;
}

function scheduleNext() {
  if (activeUploads >= concurrency) {
    return;
  }
  for (const [id, entry] of entries) {
    if (activeUploads >= concurrency) {
      break;
    }
    if (entry.snapshot.status === "pending" && !entry.running) {
      entry.running = true;
      activeUploads++;
      void runUpload(id);
    }
  }
}

async function runUpload(taskId: string) {
  const entry = entries.get(taskId);
  if (!entry) {
    activeUploads--;
    scheduleNext();
    return;
  }

  const attempt = entry.snapshot.attempt + 1;
  updateTask(taskId, {
    status: "uploading",
    attempt,
    progress: 0,
    error: null,
  });

  const controller = new AbortController();
  entry.controller = controller;

  try {
    const asset = await uploadFileViaXhr(
      buildUploadUrl(entry.snapshot.articleId),
      entry.file,
      entry.snapshot.articleId,
      (loaded, total) => {
        const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
        updateTask(taskId, { progress });
      },
      controller.signal,
    );

    updateTask(taskId, {
      status: "success",
      progress: 100,
      asset,
      completedAt: Date.now(),
    });
  } catch (error) {
    if (error instanceof UploadAbortError) {
      updateTask(taskId, {
        status: "canceled",
        error: error.message,
        completedAt: Date.now(),
      });
    } else if (
      (error instanceof UploadNetworkError ||
        (error instanceof UploadResponseError && error.retryable)) &&
      attempt < entry.snapshot.maxAttempts
    ) {
      // 可重试错误：标记为 retrying，释放并发槽，延迟后重新入队
      updateTask(taskId, {
        status: "retrying",
        error: error instanceof Error ? error.message : "上传失败。",
      });
      entry.controller = null;
      entry.running = false;
      activeUploads--;
      scheduleNext();

      setTimeout(() => {
        const current = entries.get(taskId);
        if (!current || current.snapshot.status !== "retrying") {
          return;
        }
        updateTask(taskId, { status: "pending" });
        scheduleNext();
      }, RETRY_DELAY_MS);
      return;
    } else {
      updateTask(taskId, {
        status: "error",
        error: error instanceof Error ? error.message : "上传失败。",
        completedAt: Date.now(),
      });
    }
  }

  entry.controller = null;
  entry.running = false;
  activeUploads--;
  scheduleNext();
}

// ─── 公开 API ───────────────────────────────────────────────

/**
 * 将文件加入上传队列。
 * 如果客户端校验失败，任务直接以 "error" 状态创建（仍出现在列表中，
 * 用户可在面板中看到失败原因并手动重试）。
 * 新任务入队时清理其他文章的所有终态任务，避免跨文章累积内存。
 * @returns 任务 ID
 */
function enqueue(articleId: string, file: File): string {
  const id = generateTaskId();
  const validation = validateAssetFileClientSide(file);

  const snapshot: UploadTask = {
    id,
    articleId,
    filename: file.name.normalize("NFC"),
    byteSize: file.size,
    mediaType: file.type,
    status: validation.ok ? "pending" : "error",
    progress: 0,
    attempt: 0,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    error: validation.ok ? null : validation.error,
    asset: null,
    createdAt: Date.now(),
    completedAt: validation.ok ? null : Date.now(),
  };

  entries.set(id, {
    snapshot,
    file,
    controller: null,
    running: false,
  });

  // 清理其他文章的终态任务，防止跨文章切换时内存累积。
  let _changed = false;
  for (const [taskId, entry] of entries) {
    if (entry.snapshot.articleId !== articleId) {
      const status = entry.snapshot.status;
      if (status === "success" || status === "error" || status === "canceled") {
        entries.delete(taskId);
        _changed = true;
      }
    }
  }

  emit();

  if (validation.ok) {
    scheduleNext();
  }

  return id;
}

/**
 * 手动重试已失败或已取消的任务。重置尝试次数并重新入队。
 */
function retry(taskId: string) {
  const entry = entries.get(taskId);
  if (!entry) {
    return;
  }
  const status = entry.snapshot.status;
  if (status !== "error" && status !== "canceled") {
    return;
  }

  updateTask(taskId, {
    status: "pending",
    progress: 0,
    attempt: 0,
    error: null,
    asset: null,
    completedAt: null,
  });
  scheduleNext();
}

/**
 * 取消正在排队或上传中的任务。
 * - pending/retrying：直接标记为 canceled
 * - uploading：中止 XHR，由 runUpload 的 catch 块标记为 canceled
 */
function cancel(taskId: string) {
  const entry = entries.get(taskId);
  if (!entry) {
    return;
  }
  const status = entry.snapshot.status;
  if (status === "uploading") {
    entry.controller?.abort();
  } else if (status === "pending" || status === "retrying") {
    updateTask(taskId, {
      status: "canceled",
      error: "上传已取消。",
      completedAt: Date.now(),
    });
  }
}

/**
 * 从列表中移除终态任务（success/error/canceled）。
 * 非终态任务需先 cancel 再 remove。
 */
function remove(taskId: string) {
  const entry = entries.get(taskId);
  if (!entry) {
    return;
  }
  const status = entry.snapshot.status;
  if (status !== "success" && status !== "error" && status !== "canceled") {
    return;
  }
  entries.delete(taskId);
  emit();
}

/**
 * 丢弃已失败的任务并从列表移除。
 * 与 remove 的区别：discard 语义上表示用户主动放弃失败的上传，
 * 调用方应同时清理编辑器中对应的占位符注释。
 */
function discard(taskId: string) {
  const entry = entries.get(taskId);
  if (!entry) {
    return;
  }
  const status = entry.snapshot.status;
  if (status !== "error" && status !== "canceled") {
    return;
  }
  entries.delete(taskId);
  emit();
}

/**
 * 清除所有终态任务。
 */
function clearCompleted() {
  let changed = false;
  for (const [id, entry] of entries) {
    const status = entry.snapshot.status;
    if (status === "success" || status === "error" || status === "canceled") {
      entries.delete(id);
      changed = true;
    }
  }
  if (changed) {
    emit();
  }
}

function getTask(id: string): UploadTask | undefined {
  return entries.get(id)?.snapshot;
}

function getSnapshot(): readonly UploadTask[] {
  return cachedSnapshot;
}

function getServerSnapshot(): readonly UploadTask[] {
  return EMPTY_ARRAY;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const uploadTaskManager = {
  enqueue,
  retry,
  cancel,
  remove,
  discard,
  clearCompleted,
  getTask,
  getSnapshot,
  getServerSnapshot,
  subscribe,
};
