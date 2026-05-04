/**
 * Mobile auth flow:
 * 1. POST /api/auth/mobile-login with email + password
 * 2. Backend verifies password and returns { token, user }
 * 3. Token is stored in SecureStore (Keychain/Keystore)
 * 4. Subsequent /api requests use Authorization: Bearer
 */

import { api } from "./api";
import {
  clearAuthToken,
  clearStoredUser,
  getStoredUser,
  setAuthToken,
  setStoredUser,
} from "./storage";
import type { AuthUser, LoginResponse } from "./types";

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api<LoginResponse>("/api/auth/mobile-login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
    noAuth: true,
  });
  await setAuthToken(res.token);
  await setStoredUser(res.user);
  return res.user;
}

export async function logout(): Promise<void> {
  await clearAuthToken();
  await clearStoredUser();
}

export async function loadCachedUser(): Promise<AuthUser | null> {
  return getStoredUser<AuthUser>();
}
