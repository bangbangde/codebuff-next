export function RecoveryLoginNotice() {
  return (
    <div
      className="mb-10 rounded-lg border border-brand-accent/30 bg-brand-accent/10 p-[clamp(1.25rem,3vw,2rem)]"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-accent text-background">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              clipRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875zM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1z"
              fillRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="m-0 font-medium text-foreground" lang="en">
            You signed in with a recovery code
          </p>
          <p className="m-0 mt-1 text-sm leading-body text-muted-foreground">
            你刚刚使用了恢复码登录。如果你丢失了身份验证器设备，建议尽快重新设置
            TOTP 或生成一组新的恢复码，以确保账户安全。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-foreground px-4 py-2 font-mono text-sm font-medium text-background transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-brand-accent focus-visible:bg-brand-accent focus-visible:outline-none motion-reduce:transition-none"
              href="#security-title"
            >
              管理两步验证
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
