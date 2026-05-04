/**
 * Two-tier storage:
 * - SecureStore for the auth token (Keychain on iOS, Keystore on Android).
 * - AsyncStorage for UI prefs (theme, locale) — survives reinstall? no, but
 *   that's fine for non-sensitive prefs.
 */

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "shipeh.auth.token";
const USER_KEY = "shipeh.auth.user";

export async function setAuthToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearAuthToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function setStoredUser(user: unknown) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser<T = unknown>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearStoredUser() {
  await AsyncStorage.removeItem(USER_KEY);
}

/** Generic key-value pref helpers. */
export const prefs = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
};
