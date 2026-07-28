"use client";

import { CircleCheckIcon, Layers3Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function FoundationActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Dialog>
        <DialogTrigger
          render={<Button size="lg" variant="outline" />}
        >
          <Layers3Icon data-icon="inline-start" />
          检查主题链路
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>M008 界面基础</DialogTitle>
            <DialogDescription>
              这个弹层通过 Base UI Portal 渲染，同时显式继承 Admin surface
              的语义角色。
            </DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 border-y border-border py-4 text-sm">
            <div className="grid grid-cols-[6.5rem_1fr] gap-3">
              <dt className="font-mono text-muted-foreground">Color scheme</dt>
              <dd>next-themes / System</dd>
            </div>
            <div className="grid grid-cols-[6.5rem_1fr] gap-3">
              <dt className="font-mono text-muted-foreground">Surface</dt>
              <dd>Admin</dd>
            </div>
            <div className="grid grid-cols-[6.5rem_1fr] gap-3">
              <dt className="font-mono text-muted-foreground">Primitive</dt>
              <dd>shadcn/ui / Base UI / Nova</dd>
            </div>
          </dl>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>
              完成
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        onClick={() =>
          toast.success("Admin surface 反馈链路正常", {
            description: "Sonner 正在使用当前 surface 与 color scheme 语义。",
          })
        }
        size="lg"
      >
        <CircleCheckIcon data-icon="inline-start" />
        发送全局反馈
      </Button>
    </div>
  );
}
