"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { isRealMode, USER_POOL_ID, USER_POOL_CLIENT_ID } from "./config";

type Status = "loading" | "authed" | "guest";

interface AuthValue {
  realMode: boolean;
  status: Status;
  email: string | null;
  orgName: string | null;
  signUp: (email: string, password: string, orgName: string) => Promise<void>;
  confirm: (email: string, code: string) => Promise<void>;
  resend: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  updateOrgName: (orgName: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

let amplifyConfigured = false;
async function configureAmplify() {
  if (amplifyConfigured) return;
  const { Amplify } = await import("aws-amplify");
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: USER_POOL_ID,
        userPoolClientId: USER_POOL_CLIENT_ID,
      },
    },
  });
  amplifyConfigured = true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const realMode = isRealMode();
  const [status, setStatus] = useState<Status>(realMode ? "loading" : "authed");
  const [email, setEmail] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!realMode) return;
    (async () => {
      await configureAmplify();
      try {
        const { getCurrentUser, fetchUserAttributes } = await import(
          "aws-amplify/auth"
        );
        await getCurrentUser();
        const attrs = (await fetchUserAttributes().catch(() => ({}))) as Record<
          string,
          string | undefined
        >;
        setEmail(attrs.email ?? null);
        setOrgName(attrs["custom:org_name"] ?? null);
        setStatus("authed");
      } catch {
        setStatus("guest");
      }
    })();
  }, [realMode]);

  const signUp = useCallback(async (e: string, p: string, org: string) => {
    await configureAmplify();
    const { signUp } = await import("aws-amplify/auth");
    await signUp({
      username: e,
      password: p,
      options: { userAttributes: { email: e, "custom:org_name": org } },
    });
  }, []);

  const confirm = useCallback(async (e: string, code: string) => {
    await configureAmplify();
    const { confirmSignUp } = await import("aws-amplify/auth");
    await confirmSignUp({ username: e, confirmationCode: code });
  }, []);

  const resend = useCallback(async (e: string) => {
    await configureAmplify();
    const { resendSignUpCode } = await import("aws-amplify/auth");
    await resendSignUpCode({ username: e });
  }, []);

  const signIn = useCallback(async (e: string, p: string) => {
    await configureAmplify();
    const {
      signIn,
      signOut: amplifySignOut,
      fetchUserAttributes,
    } = await import("aws-amplify/auth");
    let result;
    try {
      result = await signIn({ username: e, password: p });
    } catch (err) {
      // ブラウザに古いログイン情報が残っていると弾かれるので、消してから1回だけやり直す
      if ((err as { name?: string })?.name === "UserAlreadyAuthenticatedException") {
        await amplifySignOut().catch(() => {});
        result = await signIn({ username: e, password: p });
      } else {
        throw err;
      }
    }
    // 追加手順が必要な状態（未認証・要パスワード再設定など）を成功扱いにしない
    const step = result?.nextStep?.signInStep;
    if (step && step !== "DONE") {
      const map: Record<string, string> = {
        CONFIRM_SIGN_UP: "UserNotConfirmedException",
        RESET_PASSWORD: "PasswordResetRequiredException",
      };
      const err = new Error(`sign-in step: ${step}`);
      err.name = map[step] ?? `NextStep_${step}`;
      throw err;
    }
    const attrs = (await fetchUserAttributes().catch(() => ({}))) as Record<
      string,
      string | undefined
    >;
    setEmail(attrs.email ?? e);
    setOrgName(attrs["custom:org_name"] ?? null);
    setStatus("authed");
  }, []);

  const signOut = useCallback(async () => {
    await configureAmplify();
    const { signOut } = await import("aws-amplify/auth");
    await signOut();
    setStatus("guest");
    setEmail(null);
    setOrgName(null);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!realMode) return null;
    await configureAmplify();
    const { fetchAuthSession } = await import("aws-amplify/auth");
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  }, [realMode]);

  const updateOrgName = useCallback(async (org: string) => {
    await configureAmplify();
    const { updateUserAttributes, fetchAuthSession } = await import(
      "aws-amplify/auth"
    );
    await updateUserAttributes({
      userAttributes: { "custom:org_name": org },
    });
    // トークンを更新して custom:org_name をAPIにも反映させる
    await fetchAuthSession({ forceRefresh: true }).catch(() => {});
    setOrgName(org);
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      await configureAmplify();
      const { updatePassword } = await import("aws-amplify/auth");
      await updatePassword({ oldPassword, newPassword });
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        realMode,
        status,
        email,
        orgName,
        signUp,
        confirm,
        resend,
        signIn,
        signOut,
        getIdToken,
        updateOrgName,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
