import type {
  AuthClientError,
  TwoFactorFailure,
  TwoFactorMethod,
} from "./sign-in-types";

export function getTwoFactorFailure(
  error: AuthClientError,
  method: TwoFactorMethod,
): TwoFactorFailure {
  switch (error.code) {
    case "INVALID_TWO_FACTOR_COOKIE":
      return {
        message: "登录验证已过期，请重新输入邮箱和密码。",
        restartCredentials: true,
      };
    case "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE":
      return {
        message: "验证尝试次数过多，请重新输入邮箱和密码。",
        restartCredentials: true,
      };
    case "ACCOUNT_TEMPORARILY_LOCKED":
      return {
        message: "账户因多次验证失败被暂时锁定，请稍后重新登录。",
        restartCredentials: true,
      };
    case "TOTP_NOT_ENABLED":
    case "BACKUP_CODES_NOT_ENABLED":
    case "TWO_FACTOR_NOT_ENABLED":
      return {
        message: "两步验证状态已变化，请重新输入邮箱和密码。",
        restartCredentials: true,
      };
    case "INVALID_BACKUP_CODE":
      return {
        message: "恢复码无效或已使用，请核对后重试。",
        restartCredentials: false,
      };
    case "INVALID_CODE":
      return {
        message: "验证码不正确，请重试。",
        restartCredentials: false,
      };
    default:
      return {
        message:
          method === "recovery"
            ? "暂时无法验证恢复码，请稍后重试。"
            : "暂时无法验证验证码，请稍后重试。",
        restartCredentials: false,
      };
  }
}

export function getPasskeySignInFailureMessage(
  error: AuthClientError,
): string {
  if (
    error.code === "AUTH_CANCELLED" ||
    error.code === "ERROR_CEREMONY_ABORTED"
  ) {
    return "Passkey 登录已取消，你仍可使用邮箱和密码。";
  }

  return "无法使用 Passkey 登录，请重试或改用邮箱和密码。";
}
