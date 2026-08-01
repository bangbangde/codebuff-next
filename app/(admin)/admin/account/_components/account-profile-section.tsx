import { SignOutButton } from "@/features/account/sign-out-button";

type AccountProfileSectionProps = {
  email: string;
  name: string;
};

export function AccountProfileSection({
  email,
  name,
}: AccountProfileSectionProps) {
  return (
    <section
      aria-labelledby="account-info-title"
    >
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,1fr)] lg:gap-12">
        <div>
          <h1
            className="max-w-[12ch] text-[clamp(2.25rem,6vw,4.75rem)] leading-[0.96] font-semibold tracking-[-0.055em] text-balance"
            id="account-info-title"
            lang="en"
          >
            Account
          </h1>
          <p className="mt-5 max-w-[32rem] text-[1.0625rem] leading-7 text-muted-foreground">
            管理当前管理员身份与登录安全。此页面受 Admin 权限边界保护。
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 text-card-foreground sm:p-6">
          <dl className="m-0">
            <div className="border-b border-border pb-5">
              <dt
                className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase"
                lang="en"
              >
                Name
              </dt>
              <dd className="mt-2 ml-0 text-base font-medium">{name}</dd>
            </div>
            <div className="pt-5">
              <dt
                className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase"
                lang="en"
              >
                Email
              </dt>
              <dd className="mt-2 ml-0 break-all text-base">{email}</dd>
            </div>
          </dl>
          <div className="mt-6 border-t border-border pt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    </section>
  );
}
