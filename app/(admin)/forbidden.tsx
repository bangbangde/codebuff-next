import { ArrowLeftIcon, ShieldXIcon } from "lucide-react";
import Link from "next/link";

import { SurfaceTheme } from "@/components/surface-theme";

export default function Forbidden() {
  return (
    <SurfaceTheme
      className="grid min-h-dvh place-items-center bg-background px-5 py-12 text-foreground"
      surface="admin"
    >
      <main className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground sm:p-8">
        <ShieldXIcon
          aria-hidden="true"
          className="size-8 text-destructive"
        />
        <p className="mt-6 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
          403 / Admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
          当前账户没有后台权限
        </h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
          登录状态有效，但 Admin
          入口还需要独立的服务端角色授权。普通账户不会因此获得管理权限。
        </p>
        <Link
          className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
          href="/"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          返回 Site
        </Link>
      </main>
    </SurfaceTheme>
  );
}
