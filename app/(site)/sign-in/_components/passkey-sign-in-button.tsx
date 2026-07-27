import { authSecondaryButtonClassName } from "@/app/(site)/_components/auth-form-styles";

type PasskeySignInButtonProps = {
  disabled: boolean;
  pending: boolean;
  onSignIn: () => void;
};

export function PasskeySignInButton({
  disabled,
  pending,
  onSignIn,
}: PasskeySignInButtonProps) {
  return (
    <>
      <button
        className={authSecondaryButtonClassName}
        disabled={disabled}
        onClick={onSignIn}
        type="button"
      >
        {pending ? "Waiting for passkey…" : "Sign in with a passkey"}
      </button>
      <p className="mt-3 text-center text-sm leading-body text-muted-foreground">
        使用设备解锁、密码管理器或安全密钥完成登录，无需再次验证 TOTP。
      </p>
    </>
  );
}
