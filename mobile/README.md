# Shipeh Mobile (iOS + Android)

A React Native + Expo app that talks to the same Shipeh backend as the web
platform. Built with Expo Router, NativeWind, TanStack Query, JWT auth,
biometric unlock, push-notifications-ready, English + Arabic (RTL) — same
brand red as the web.

```
mobile/
├── app/                    Expo Router (file-based routing)
│   ├── _layout.tsx         Providers (auth, theme, i18n, query)
│   ├── index.tsx           Boot redirect (login or tabs)
│   ├── login.tsx           Email/password + biometric unlock
│   ├── (tabs)/
│   │   ├── _layout.tsx     Bottom tab bar
│   │   ├── home.tsx        Role-aware dashboard + KPIs
│   │   ├── tickets.tsx     Queue with filter chips
│   │   ├── leaderboard.tsx Read-only podium + rank list
│   │   └── profile.tsx     Theme + language + push + sign out
│   └── tickets/[id].tsx    Detail: comments, status change
├── components/             UI primitives (Card, Badge, Button, …)
├── lib/                    api client, auth, theme, i18n, types
├── app.config.ts           Expo config (reads EXPO_PUBLIC_API_BASE_URL)
└── eas.json                EAS Build / Submit profiles
```

---

## 1. Run it on your phone in 60 seconds (no Apple / Google account needed)

```bash
# from repo root
cd mobile
npx expo start --tunnel
```

1. Open the **Expo Go** app on your phone (free on App Store / Play Store).
2. Scan the QR code printed in your terminal.
3. The Shipeh app loads instantly. You're done.

> The first launch with `--tunnel` takes ~20s. Subsequent launches are
> faster. If your phone and laptop are on the same Wi-Fi, you can drop
> `--tunnel` for an even faster connection.

### Point it at your live backend

By default the app talks to `http://localhost:3000`. To use the deployed
Shipeh backend, set the env var **before** `expo start`:

```bash
EXPO_PUBLIC_API_BASE_URL="https://your-shipeh.netlify.app" npx expo start --tunnel
```

Or create a `.env` file in `mobile/`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-shipeh.netlify.app
```

The mobile login screen calls `POST /api/auth/mobile-login` (added by this
branch), which issues a JWT signed with the same `NEXTAUTH_SECRET` the
web app uses. Existing `/api/tickets`, `/api/tickets/[id]`,
`/api/tickets/[id]/comments`, `/api/tickets/summary`, `/api/leaderboard`
and `/api/accounting/summary` accept either the cookie session (web) or
`Authorization: Bearer <jwt>` (mobile).

---

## 2. Features in v0.1

- ✅ Email/password login → JWT in iOS Keychain / Android Keystore
- ✅ Face ID / fingerprint unlock for returning users
- ✅ Role-aware home (managers see KPIs + leaderboard, sourcing/accounting see ticket queue)
- ✅ Tickets list with status chips, urgent/high color stripe, pull-to-refresh
- ✅ Ticket detail: read description + comments, post new comment, change status
- ✅ Leaderboard with podium for top 3 + ranked list
- ✅ Profile: dark/light theme, English/Arabic with RTL flip, push enable
- ✅ Push notification permissions wired (channel + handler ready)
- ✅ TanStack Query caching, automatic re-fetch on focus, error states
- ✅ Same brand color (#a31d2a) as the web — visual consistency

### What's intentionally NOT in v0.1 (add when you're ready)

- Creating new tickets from mobile (sourcing agents typically receive, not create)
- Accounting ledger entry on mobile (data entry is desktop work)
- Admin tools (users, rewards, FX rates)
- Photo upload from camera (next phase)
- Offline queue for posted comments (next phase)

---

## 3. Build a real installable app (when you're ready for the App Store / Play Store)

This requires accounts I cannot create for you:

- **Apple Developer Program** — $99/yr — https://developer.apple.com/programs
- **Google Play Console** — $25 one-time — https://play.google.com/console

Once you have those, building is one command per platform:

```bash
# from mobile/
npm install -g eas-cli
eas login                       # uses your free Expo account
eas build:configure             # one-time: links project to EAS
eas build --platform ios        # produces a signed .ipa
eas build --platform android    # produces a signed .aab
eas submit --platform ios       # uploads to App Store Connect / TestFlight
eas submit --platform android   # uploads to Play Console
```

Then publish OTA bug fixes without store review:

```bash
eas update --branch production --message "fix login button"
```

Bundle identifiers are pre-set: `com.shipeh.mobile` (both stores).

---

## 4. Push notifications (ready, needs credentials)

The `expo-notifications` plugin is configured. To go live:

- **iOS** — Apple Developer account → APNs Key (.p8) → upload to EAS:
  `eas credentials` and select Push Notifications.
- **Android** — Firebase project → service-account JSON → upload to EAS.

Then call `Notifications.getExpoPushTokenAsync()` from `profile.tsx` (the
"Enable" button is already wired) to get a token, store it on your
backend tied to the user, and send pushes via the Expo Push API or FCM.

---

## 5. Useful commands

```bash
npm run start          # expo start --tunnel (use Expo Go to test)
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm run android        # build & launch on connected Android device/emulator
npm run ios            # build & launch on connected iOS simulator (macOS only)
```

---

## 6. Architecture notes

### Auth — JWT, same secret as web

`lib/mobile-auth.ts` (in the web project) uses NextAuth's
`encode`/`decode` so mobile JWTs share the existing `NEXTAUTH_SECRET`.
The mobile client sends `Authorization: Bearer <jwt>`; the API route
helper `getSessionFromRequest()` accepts either the bearer or the
existing cookie session, then returns the same `Session` shape every
existing route already understands. You add mobile to a route by
swapping one line:

```ts
// before
const session = await getServerSession(authOptions);
// after
const session = await getSessionFromRequest(req);
```

### Theming — NativeWind + class-based dark mode

`tailwind.config.js` ships the same `brand` red palette as the web. Use
`bg-brand`, `text-brand`, etc. The theme context calls
`colorScheme.set("dark"|"light")` to flip the whole app.

### i18n — same key namespace as web

`lib/i18n.ts` is a leaner mirror of the web's dictionary. Adding a key:

1. Add it to both `en` and `ar` objects.
2. Use `const t = useT();` then `t("my.key")` in any component.

Switching to Arabic calls `I18nManager.forceRTL(true)` and reloads the
app via `expo-updates` so the layout direction takes effect. In Expo Go
the alert will mention restart and you can simply close-and-reopen.

### Storage

- `expo-secure-store` for the JWT (Keychain / Keystore)
- `@react-native-async-storage/async-storage` for non-sensitive prefs
  (theme, locale, cached user object)

### Backend

The mobile app needs the new endpoint deployed:

- `POST /api/auth/mobile-login` (returns `{ token, user }`)
- `lib/mobile-auth.ts` (server-side helper)

Both ship in the `mobile-app` branch alongside this folder. After you
merge to your deployment branch (Netlify will auto-build), the mobile
app pointed at production will work end-to-end.
