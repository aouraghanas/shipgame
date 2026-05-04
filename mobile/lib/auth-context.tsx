import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as LocalAuthentication from "expo-local-authentication";
import {
  loadCachedUser,
  login as loginRequest,
  logout as logoutRequest,
} from "./auth";
import { getAuthToken } from "./storage";
import type { AuthUser } from "./types";

interface Ctx {
  user: AuthUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
}

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [tok, cached] = await Promise.all([getAuthToken(), loadCachedUser()]);
        if (tok && cached) setUser(cached);
      } catch {}
      setReady(true);
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await loginRequest(email, password);
    setUser(u);
    return u;
  }, []);

  const signOut = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  /**
   * If a token is already stored (returning user), prompt for biometrics
   * and resolve true on success. We don't unlock secrets — the token is
   * already in the Keychain — this is purely a UX gate.
   */
  const unlockWithBiometrics = useCallback(async () => {
    const has = await LocalAuthentication.hasHardwareAsync();
    if (!has) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;
    const tok = await getAuthToken();
    if (!tok) return false;
    const cached = await loadCachedUser();
    if (!cached) return false;
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: "Sign in to Shipeh",
      cancelLabel: "Use password",
    });
    if (r.success) {
      setUser(cached);
      return true;
    }
    return false;
  }, []);

  const value = useMemo<Ctx>(
    () => ({ user, ready, signIn, signOut, unlockWithBiometrics }),
    [user, ready, signIn, signOut, unlockWithBiometrics]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
