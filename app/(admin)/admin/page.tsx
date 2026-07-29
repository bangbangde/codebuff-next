import {
  CircleCheckIcon,
  KeyRoundIcon,
  PanelsTopLeftIcon,
  ShieldCheckIcon,
} from "lucide-react";

const currentCapabilities = [
  {
    description: "Session 与持久化 Admin role 在服务端共同校验。",
    icon: ShieldCheckIcon,
    label: "Authorization",
    value: "Admin boundary active",
  },
  {
    description: "固定 Header、可折叠侧栏与移动端抽屉已组成稳定框架。",
    icon: PanelsTopLeftIcon,
    label: "Application frame",
    value: "Responsive shell active",
  },
] as const;

export default function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <section aria-labelledby="admin-title" className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.1em] text-brand-accent uppercase">
          Admin / Overview
        </p>
        <h1
          className="mt-4 max-w-[16ch] text-[clamp(2.25rem,6vw,4.75rem)] leading-[0.96] font-semibold tracking-[-0.055em] text-balance"
          id="admin-title"
        >
          管理工作从这里开始。
        </h1>
        <p className="mt-6 max-w-2xl text-[1.0625rem] leading-7 text-muted-foreground">
          当前阶段提供受独立角色保护的后台框架和清晰导航。账户迁移、内容管理与其他工作流会在各自的工作项中逐步接入。
        </p>
      </section>

      <section
        aria-labelledby="capabilities-title"
        className="mt-10 border-t border-border pt-7 sm:mt-12 sm:pt-8"
      >
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
              Current capability
            </p>
            <h2
              className="mt-2 text-xl font-semibold tracking-[-0.025em]"
              id="capabilities-title"
            >
              已接入的基础能力
            </h2>
          </div>
          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <CircleCheckIcon
              aria-hidden="true"
              className="size-4 text-brand-accent"
            />
            Ready for review
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {currentCapabilities.map((capability) => {
            const Icon = capability.icon;

            return (
              <article
                className="rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6"
                key={capability.label}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-mono text-xs tracking-[0.06em] text-muted-foreground uppercase">
                    {capability.label}
                  </p>
                  <Icon
                    aria-hidden="true"
                    className="size-5 text-brand-accent"
                  />
                </div>
                <h3 className="mt-8 text-base font-semibold">
                  {capability.value}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {capability.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="boundary-title"
        className="mt-8 rounded-lg border border-border bg-muted p-5 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <KeyRoundIcon
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-brand-accent"
          />
          <div>
            <h2 className="text-sm font-semibold" id="boundary-title">
              Account 迁移尚未开始
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              本工作项只建立 Shell 与授权边界。Account
              仍指向现有页面，后续会在独立工作项中迁入 Admin，并保持既有安全行为。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
