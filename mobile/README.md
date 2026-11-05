# Gouri TaskFlow — mobile app (Android & iPhone)

The phone app for TaskFlow, built with **Expo / React Native** from the designer's 18 app screens.
It talks to the **same backend** as the website (`../server`), so logins, tasks, daily work,
attendance, leave and notifications are shared between web and phone.

## Screens

| Design | Screen in the app | File |
|---|---|---|
| Screen-1, 2 | Intro / onboarding (first launch only) | `app/intro.js` |
| Screen-3 | Sign in, Register, Forgot password, Enterprise workspace | `app/login.js` |
| Screen-4 | Dashboard | `app/(tabs)/index.js` |
| Screen-5 | Projects | `app/(tabs)/projects.js` |
| Screen-6 | Daily Work Update (employees) / Daily Work Monitor (managers) | `app/(tabs)/daily-work.js` |
| Screen-7 | Attendance (+ Team tab for managers) | `app/(tabs)/attendance.js` |
| Screen-8 | More | `app/(tabs)/more/index.js` |
| Screen-9 | My Profile | `app/(tabs)/more/profile.js` |
| Screen-10 | Personal Information (with photo upload) | `app/(tabs)/more/personal.js` |
| Screen-11 | Change Password | `app/(tabs)/more/password.js` |
| Screen-12 | Leave Management | `app/(tabs)/more/leave.js` |
| Screen-13 | Work Calendar | `app/(tabs)/more/calendar.js` |
| Screen-14 | My Tasks | `app/(tabs)/more/tasks.js` |
| Screen-15 | Notifications | `app/(tabs)/more/notifications.js` |
| Screen-16 | Reports & Analytics (managers) | `app/(tabs)/more/reports.js` |
| Screen-17, 17.1 | Recurring Task Templates (managers) | `app/(tabs)/more/templates.js` |
| — | Help & Support, About Us | `app/(tabs)/more/help.js`, `about.js` |

Shared pieces: `src/theme.js` (colours, fonts, design scale), `src/components/` (cards, buttons,
fields, header, side menu, search), `src/api.js` (server address + login token).

## 1. Run it on your phone (Expo Go) — quickest way to test

1. Install **Node.js 20 or newer** on the computer.
2. On the phone, install **Expo Go** from the Play Store / App Store.
3. Start the backend as usual (`cd server` → `npm run dev`).
4. Tell the app where the backend is. Copy `.env.example` to `.env` and set the address:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.25:5000/api
   ```
   * Testing at home/office: use your **computer's Wi-Fi IP** (Windows: run `ipconfig`, look for
     "IPv4 Address"). `localhost` will **not** work on a phone. Phone and computer must be on the
     same Wi-Fi, and Windows Firewall must allow Node on port 5000.
   * Live server: use your domain, e.g. `https://yourdomain.com/api`.
5. In a terminal:
   ```
   cd mobile
   npm install
   npx expo start
   ```
6. Scan the QR code with Expo Go (Android) or the Camera app (iPhone). The app opens.

You can also change the server later inside the app: Sign-in screen → **Enterprise workspace**.

## 2. Make an installable APK (Android)

```
npm install -g eas-cli
cd mobile
eas login                      # free Expo account
eas build -p android --profile preview
```
When the build finishes you get a download link for the `.apk` — send it to employees and install.
For the Play Store use `--profile production` (makes an `.aab`).
Before building, set `EXPO_PUBLIC_API_URL` to the **live** server address (in `.env`), because a
Wi-Fi IP only works on your own network.

iPhone builds need an Apple Developer account: `eas build -p ios`.

## Backend change needed

The app adds one server endpoint — **profile photo upload** (`POST /api/auth/avatar`, in
`server/src/routes.js`). Redeploy/restart the server after pulling this change. Everything else
uses the existing API.

## Notes

* Text and spacing are scaled from the 882 px-wide designs (`u()` and `fs()` in `src/theme.js`),
  so the layout fits any phone width.
* Login token is kept in the phone's secure storage; "Remember me" only remembers the email/mobile.
* Exports on Reports: CSV and PDF are made on the phone and opened in the share sheet; Excel is
  downloaded from the server (`/reports/export`).
* Items in the designs that the backend doesn't support yet are not shown or are informational
  only: Announcements and Settings rows on "More", Appearance/Language (shown, fixed to
  Light/English), "Stay logged in on other devices", and CSV/Excel/PDF on Templates
  (a **Generate today** button is there instead).
