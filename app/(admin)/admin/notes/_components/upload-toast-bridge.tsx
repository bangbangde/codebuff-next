"use client";

import { useEffect, useRef } from "react";

import { toast } from "@/components/ui/toast";
import { useUploadActions, useUploadTasks } from "@/features/article-assets/use-upload-tasks";
import { UploadToastBody } from "./upload-toast-body";

/** 成功 toast 自动消失延迟（毫秒） */
const SUCCESS_DURATION = 1500;

/**
 * 无 UI 协调层：监听当前文章的上传任务，按状态迁移驱动 base-ui toast 生命周期。
 *
 * 每文件独立一条 toast，用 taskId 作为 toast id 保证稳定性。toast 携带
 * data.render = <UploadToastBody taskId={taskId} />，由 ToastList 直接渲染
 * 附件卡片；进度更新由 UploadToastBody 内部订阅完成，无需 update toast。
 *
 * 关键边界：小文件可能在 React 首次 render 前就完成上传（pending→success
 * 多次 emit 在一次 render 前完成），导致 effect 首次运行时 task 已是终态。
 * 因此首次见到 task 时无论什么状态都先创建 toast，再按终态设置延时关闭。
 */
export function UploadToastBridge({ articleId }: { articleId: string }) {
  const allTasks = useUploadTasks();
  const { remove } = useUploadActions();

  // 记录每个 task 的上一次状态，用于检测状态迁移
  const statusMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const tasks = allTasks.filter((t) => t.articleId === articleId);
    const currentIds = new Set(tasks.map((t) => t.id));

    for (const task of tasks) {
      const prevStatus = statusMapRef.current.get(task.id);
      if (prevStatus === task.status) {
        continue;
      }

      // 首次见到，或从 error/canceled 恢复（重试）：创建 toast
      const needsCreate =
        prevStatus === undefined ||
        prevStatus === "error" ||
        prevStatus === "canceled";

      if (needsCreate) {
        // 若已是终态（小文件瞬间完成），type 直接设为对应类型
        const initialType =
          task.status === "success"
            ? "success"
            : task.status === "error"
              ? "error"
              : "loading";

        toast.add({
          id: task.id,
          data: { render: <UploadToastBody taskId={task.id} /> },
          timeout: 0,
          type: initialType,
          onRemove: () => remove(task.id),
        });
      }

      switch (task.status) {
        case "success":
          // 成功：非首次创建时更新类型；统一用 setTimeout 保证可靠消失
          if (!needsCreate) {
            toast.update(task.id, { type: "success" });
          }
          window.setTimeout(() => toast.close(task.id), SUCCESS_DURATION);
          break;
        case "error":
          if (!needsCreate) {
            toast.update(task.id, { type: "error" });
          }
          break;
        case "canceled":
          // 取消：触发退出动画，task 在 onRemove 回调里清理
          toast.close(task.id);
          break;
        // pending/uploading/retrying 的进度更新由 UploadToastBody 内部订阅
      }

      statusMapRef.current.set(task.id, task.status);
    }

    // 清理已消失的任务（如其他地方 remove 后从 store 删除）
    for (const [id] of statusMapRef.current) {
      if (!currentIds.has(id)) {
        toast.close(id);
        statusMapRef.current.delete(id);
      }
    }
  }, [allTasks, articleId, remove]);

  return null;
}
