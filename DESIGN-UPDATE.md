# New employee design (Gouri Aqua Plast theme)

The designer's 8 employee screens (Dashboard, Projects, Daily Work, Attendance, Leave,
Calendar, Additional Tasks, Notifications) are now built into the React client.
No backend changes were needed.

## Where things are

| What | File |
| --- | --- |
| All new styling (colours, sidebar, header, cards, pages) | `client/src/theme.css` (loaded after `styles.css` in `main.jsx`) |
| Sidebar + header + page background | `client/src/components/Layout.jsx` |
| Reusable pieces: `PageHead`, `DateChip`, `StatCard`, `DIcon`, `Empty` with illustration | `client/src/components/UI.jsx` |
| Pages | `client/src/pages/Dashboard.jsx`, `Projects.jsx`, `DailyWork.jsx`, `Attendance.jsx`, `Leave.jsx`, `Calendar.jsx`, `Tasks.jsx`, `Notifications.jsx` |
| Images from the designer | `client/public/design/` (logo, icons, background photo, bottom illustration, empty-state illustrations) |
| Font | Poppins, loaded in `client/index.html` |

## Notes

- The theme is scoped to the logged-in app (`.gp` class), so the Login page is unchanged.
- Admin / Super Admin pages use the same new sidebar, header and background.
- **Daily Work:** the design shows "Work completed today", "Blockers", "Plan for tomorrow"
  and "Submission note". These are sent inside the task's existing submission note under those
  headings, so the manager sees them in the review screen and they are pre-filled again if the
  task comes back for rework. "Save progress" saves the slider to the server and keeps the typed
  text as a draft in the browser. If you have several tasks in a day, they appear as tabs on top.
- Changing a colour: edit the variables at the top of `theme.css` (`--gp-navy`, `--gp-blue`, ...).
- Using a designer icon anywhere: `<DIcon name="calendar" />` (any file name in `public/design/icons`).
- The logo and empty-state illustrations were cut out of the mockup images. For sharper versions,
  ask the designer for SVG/PNG exports and replace the files in `public/design/` with the same names.
