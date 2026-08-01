type RecoveryCodePanelProps = {
  codes: string[];
  regenerated?: boolean;
};

export function RecoveryCodePanel({
  codes,
  regenerated = false,
}: RecoveryCodePanelProps) {
  return (
    <div className="rounded-md border border-border bg-surface-muted p-4">
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
          <p className="m-0 font-medium text-foreground">
            {regenerated
              ? "保存新的恢复码"
              : "保存恢复码"}
          </p>
          <p className="m-0 mt-1 text-sm leading-body text-muted-foreground">
            以下是 {codes.length} 枚{regenerated ? "新的" : ""}
            一次性恢复码。
            {regenerated && "旧恢复码已全部作废。"}
            无法使用身份验证器时，每次登录输入其中任意一枚。每枚只能使用一次。
            请将它们保存到安全位置；离开本页后将无法再次查看。
          </p>
        </div>
      </div>

      <ul className="mt-4 grid list-inside list-disc grid-cols-2 gap-2 rounded-md border border-border bg-background p-4 font-mono text-sm marker:text-brand-accent">
        {codes.map((code) => (
          <li key={code} className="text-foreground">
            {code}
          </li>
        ))}
      </ul>
    </div>
  );
}
