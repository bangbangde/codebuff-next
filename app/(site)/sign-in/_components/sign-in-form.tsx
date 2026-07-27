"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";
import {
  getPasskeySignInFailureMessage,
  getTwoFactorFailure,
} from "../_lib/sign-in-errors";
import type {
  AuthClientError,
  SignInPendingAction,
  SignInStep,
  TwoFactorMethod,
} from "../_lib/sign-in-types";
import { CredentialsStep } from "./credentials-step";
import { RecoveryCodeStep } from "./recovery-code-step";
import { TotpStep } from "./totp-step";

export function SignInForm() {
  const router = useRouter();
  const [step, setStep] = useState<SignInStep>("credentials");
  const [pendingAction, setPendingAction] =
    useState<SignInPendingAction | null>(null);
  const [message, setMessage] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  function completeSignIn(recoveryCodeUsed = false) {
    router.replace(recoveryCodeUsed ? "/account?recovery=1" : "/account");
    router.refresh();
  }

  function handleTwoFactorFailure(
    error: AuthClientError,
    method: TwoFactorMethod,
  ) {
    const failure = getTwoFactorFailure(error, method);

    if (failure.restartCredentials) {
      setPendingEmail("");
      setStep("credentials");
    }

    setMessage(failure.message);
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("credentials");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setPendingEmail(email);

    try {
      const result = await authClient.signIn.email({ email, password });
      const data = result.data as Record<string, unknown> | null;

      if (data?.twoFactorRedirect === true) {
        setStep("totp");
        return;
      }

      if (result.error) {
        setMessage("邮箱或密码不正确，请重试。");
        return;
      }

      completeSignIn();
    } catch {
      setMessage("暂时无法登录，请稍后重试。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleTotpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("totp");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("totp-code") ?? "").trim();

    try {
      const result = await authClient.twoFactor.verifyTotp({ code });

      if (result.error) {
        handleTwoFactorFailure(result.error, "totp");
        return;
      }

      completeSignIn();
    } catch {
      setMessage("暂时无法验证，请稍后重试。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("recovery");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("backup-code") ?? "").trim();

    try {
      const result = await authClient.twoFactor.verifyBackupCode({ code });

      if (result.error) {
        handleTwoFactorFailure(result.error, "recovery");
        return;
      }

      completeSignIn(true);
    } catch {
      setMessage("暂时无法验证，请稍后重试。");
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePasskeySignIn() {
    if (!("PublicKeyCredential" in window)) {
      setMessage("当前浏览器或设备不支持 Passkey。");
      return;
    }

    setPendingAction("passkey");
    setMessage("");

    try {
      const result = await authClient.signIn.passkey();
      const error = result.error as AuthClientError | null;

      if (error) {
        setMessage(getPasskeySignInFailureMessage(error));
        return;
      }

      completeSignIn();
    } catch {
      setMessage("暂时无法使用 Passkey 登录，请稍后重试。");
    } finally {
      setPendingAction(null);
    }
  }

  if (step === "totp") {
    return (
      <TotpStep
        email={pendingEmail}
        message={message}
        onSubmit={handleTotpSubmit}
        onUseRecoveryCode={() => {
          setStep("recovery");
          setMessage("");
        }}
        pending={pendingAction !== null}
      />
    );
  }

  if (step === "recovery") {
    return (
      <RecoveryCodeStep
        message={message}
        onBackToTotp={() => {
          setStep("totp");
          setMessage("");
        }}
        onSubmit={handleRecoverySubmit}
        pending={pendingAction !== null}
      />
    );
  }

  return (
    <CredentialsStep
      message={message}
      onPasskeySignIn={() => void handlePasskeySignIn()}
      onSubmit={handleCredentialsSubmit}
      pendingAction={pendingAction}
    />
  );
}
