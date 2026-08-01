import { authSecondaryButtonClassName } from "@/features/auth/auth-form-styles";

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
        {pending ? "正在等待 Passkey…" : "使用 Passkey 登录"}
      </button>
      <p className="mt-3 text-center text-sm leading-body text-muted-foreground">
        使用设备解锁、密码管理器或安全密钥完成登录，无需再次验证 TOTP。
      </p>
    </>
  );
}
