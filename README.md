# College Quiz & Management System

Flask backend + React (Vite) frontend, live PostgreSQL database (`college_live`).

## Run
```
pip install -r requirements.txt
python backend/app.py          # http://127.0.0.1:5000  (serves the built frontend in frontend/dist)
```
Frontend development (optional): `cd frontend && npm install && npm run dev` (port 5173, proxies /api to 5000).

## Database
- Live Database: PostgreSQL (`college_live` on localhost:5432). Configured in `backend/db.py`.
- Environment variables: `DATABASE_URL` or `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.
- Live Users Report View: Query directly in pgAdmin or psql: `SELECT * FROM registered_users_report;`
- Start-up automatically seeds demo accounts (password `Admin@123`): superadmin / eleanor (super admin), admin (admin),
  xavier (HOD), alan (teacher), lovelace (class teacher), alex (student), arthur (accountant).
