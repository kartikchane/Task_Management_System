# Ganesh Gauri Industries — Task Management System

A full MERN workforce and task management system for one Boss/Super Admin, department Managers/Admins, and Employees.

## Included
- Single protected Super Admin account
- Manager and Employee CRUD with department scoping
- Projects and additional task Kanban workflow
- Mandatory daily work updates and reusable daily task templates
- Manual/automatic daily generation endpoint with holiday and approved-leave skipping
- Attendance check-in/check-out and working-minute calculation
- Leave requests, Manager/Boss approval, holiday calendar
- Task submission, approval, rework, comments and local attachments
- Socket.IO live notifications and dashboard events
- Calendar combining deadlines, leave and holidays
- Reports, CSV and Excel export
- Audit logs, profile/password change, forgot/reset password token flow
- Helmet, CORS, rate limiting, JWT, bcrypt, RBAC and department isolation
- Docker MongoDB setup, seed data and responsive React UI

## Run
1. `docker compose up -d`
2. Copy `server/.env.example` to `server/.env`
3. `npm run install:all`
4. `npm run seed`
5. Terminal 1: `npm run server`
6. Terminal 2: `npm run client`
7. Open http://localhost:5173

## Demo credentials
- Boss: superadmin@taskflow.com / Password@123
- Manager: admin@taskflow.com / Password@123
- Employee: employee@taskflow.com / Password@123

## Production adapters
Local uploads and console reset links work immediately. For deployment, configure SMTP and replace local upload storage with S3/Cloudinary; adapter points are documented in `.env.example`.

## Phase 1 core status
Core task-management Phase 1 is implemented:
- Auth, JWT sessions, protected routes and role-based access for Super Admin, Admin and Employee.
- Department, people, project and task management with scoped access.
- Task assignment, comments, attachments, progress updates, submission, approval, rejection and rework.
- Task history timeline for major task events.
- Employee daily work, attendance, leave, holidays and calendar workflows.
- Dashboards, analytics, CSV export, Excel export and browser PDF/print export.
- Audit logs, notifications, profile/password updates and reset-password flow.
- Backend request validation for the main create/update workflow APIs.

## Final testing checklist
1. Seed data with `npm run seed`.
2. Sign in as each demo role and verify dashboard, projects, tasks, leave and attendance.
3. As Admin, assign a task to an Employee.
4. As Employee, update progress, add a comment, upload a file and submit the task.
5. As Admin, approve, reject and request rework on submitted tasks.
6. Check the task detail history timeline after each workflow action.
7. Open Reports, apply filters, export CSV/Excel and use PDF print.
8. Test forgot password from Login and open the console-generated `/reset-password?token=...` link.
