"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StatusPayload = {
  ok: boolean;
  enabled: boolean;
  credentialCount: number;
  remainingBackupCodes: number;
  verified: boolean;
};

type RegisterVerifyPayload = {
  ok: boolean;
  backupCodes?: string[];
  message?: string;
};

type Props = {
  nextPath: string;
};

export function TwoFactorGate({ nextPath }: Props) {
  const t = useTranslations("TwoFactor");
  const router = useRouter();
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  const needsSetup = useMemo(
    () => status !== null && status.credentialCount === 0,
    [status],
  );

  const loadStatus = useCallback(
    async (options?: { skipNavigation?: boolean }) => {
      const response = await fetch("/api/auth/2fa/status", {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("status fetch failed");
      }
      const payload = (await response.json()) as StatusPayload;
      setStatus(payload);
      if (payload.verified && !options?.skipNavigation) {
        router.replace(nextPath);
        router.refresh();
      }
    },
    [nextPath, router],
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleRegister() {
    setBusy(true);
    setError(null);
    setNewBackupCodes(null);
    try {
      const optionsResponse = await fetch("/api/auth/2fa/webauthn/register/options", {
        method: "POST",
        credentials: "include",
      });
      if (!optionsResponse.ok) {
        throw new Error("register options failed");
      }
      const optionsPayload = (await optionsResponse.json()) as {
        ok: boolean;
        options: PublicKeyCredentialCreationOptions;
      };
      const registrationResult = await startRegistration({
        optionsJSON: optionsPayload.options as never,
      });

      const verifyResponse = await fetch("/api/auth/2fa/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: registrationResult }),
        credentials: "include",
      });
      const verifyPayload = (await verifyResponse.json()) as RegisterVerifyPayload;
      if (!verifyResponse.ok || !verifyPayload.ok) {
        throw new Error(verifyPayload.message ?? "register verify failed");
      }
      setNewBackupCodes(verifyPayload.backupCodes ?? []);
      try {
        await loadStatus({ skipNavigation: true });
      } catch (statusError) {
        console.error("[TwoFactor] status after register:", statusError);
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(t("registerFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleAuthenticate() {
    setBusy(true);
    setError(null);
    try {
      const optionsResponse = await fetch(
        "/api/auth/2fa/webauthn/authenticate/options",
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!optionsResponse.ok) {
        throw new Error("auth options failed");
      }
      const optionsPayload = (await optionsResponse.json()) as {
        ok: boolean;
        options: PublicKeyCredentialRequestOptions;
      };

      const authenticationResult = await startAuthentication({
        optionsJSON: optionsPayload.options as never,
      });

      const verifyResponse = await fetch(
        "/api/auth/2fa/webauthn/authenticate/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: authenticationResult }),
        },
      );
      if (!verifyResponse.ok) {
        throw new Error("auth verify failed");
      }

      try {
        await loadStatus({ skipNavigation: true });
      } catch (statusError) {
        console.error("[TwoFactor] status after authenticate:", statusError);
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(t("authFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleBackupVerify() {
    if (!backupCode.trim()) {
      setError(t("backupCodeRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/2fa/backup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: backupCode.trim() }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("backup verify failed");
      }
      try {
        await loadStatus({ skipNavigation: true });
      } catch (statusError) {
        console.error("[TwoFactor] status after backup:", statusError);
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(t("backupCodeInvalid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {needsSetup ? t("setupDescription") : t("verifyDescription")}
      </p>

      {newBackupCodes && newBackupCodes.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">{t("backupCodesTitle")}</p>
          <p className="mb-2">{t("backupCodesHint")}</p>
          <ul className="grid grid-cols-2 gap-1 font-mono">
            {newBackupCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {needsSetup ? (
        <Button type="button" className="w-full min-h-[44px]" disabled={busy} onClick={() => void handleRegister()}>
          {busy ? t("processing") : t("registerButton")}
        </Button>
      ) : (
        <Button type="button" className="w-full min-h-[44px]" disabled={busy} onClick={() => void handleAuthenticate()}>
          {busy ? t("processing") : t("authenticateButton")}
        </Button>
      )}

      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="text-sm font-medium">{t("backupCodeSectionTitle")}</p>
        <Input
          value={backupCode}
          onChange={(event) => setBackupCode(event.target.value)}
          placeholder={t("backupCodePlaceholder")}
          autoComplete="one-time-code"
        />
        <Button
          type="button"
          variant="outline"
          className="w-full min-h-[44px]"
          disabled={busy}
          onClick={() => void handleBackupVerify()}
        >
          {t("backupCodeVerifyButton")}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
