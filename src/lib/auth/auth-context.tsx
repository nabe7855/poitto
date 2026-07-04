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
    const { signIn, fetchUserAttributes } = await import("aws-amplify/auth");
    await signIn({ username: e, password: p });
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
