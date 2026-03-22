# CrewForge AI Sandbox (frontend)

Prototype UI for the CrewForge multi-agent research platform. The original Figma reference: [CrewForge AI Sandbox Prototype](https://www.figma.com/design/qlk3ihSZzeos52WwwkdbnX/CrewForge-AI-Sandbox-Prototype).

## Prerequisites

- Node.js 18+ (includes `npm`). On Windows, if `npm` is not recognized, install [Node.js LTS](https://nodejs.org/) or run: `winget install OpenJS.NodeJS.LTS`, then **close and reopen** your terminal (or Cursor) so `PATH` includes `C:\Program Files\nodejs`.
- Backend API running (Flask) — default **port 8080** for `GET /health`, `POST /auth`, `GET /run/chess?mode=auto`, etc.

### Windows: `npm` / `vite` not found

1. Confirm Node is on your PATH: `node -v` and `npm -v` in a **new** terminal after installing.
2. In this folder, install dependencies once: `npm install` (local `vite` lives in `node_modules/.bin`).
3. If the current shell still cannot find `npm`, refresh PATH for that session:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Windows PowerShell: `npm.ps1 cannot be loaded` / execution policy

PowerShell may block the `npm` shim (`npm.ps1`). Use either:

**Option A — call the CMD shim (no policy change):**

```powershell
npm.cmd -v
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

**Option B — allow local scripts for your user (one-time):**

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then `npm` works as usual. Alternatively use **Command Prompt** (`cmd.exe`) instead of PowerShell.

## Install & run

```bash
npm i
npm run dev
```

Dev server: **http://localhost:3000**

## API base URL

| Scenario | `.env` / env var |
|----------|------------------|
| **Recommended local dev** (avoids CORS): proxy in `vite.config.ts` forwards `/api` → `http://localhost:8080` | `VITE_API_BASE_URL=/api` |
| **Direct to Flask** (ensure `FRONTEND_ORIGIN` on the backend allows `http://localhost:3000`) | `VITE_API_BASE_URL=http://localhost:8080` |

Copy `.env.example` to `.env` and adjust. Restart `npm run dev` after changing env vars.

## Backend contract used by this frontend

- Auth:
  - `POST /register` with `{ "username": "...", "password": "..." }`
  - `POST /auth` with `{ "credentials_token": "<base64url-json>" }`
  - `DELETE /auth/token` with `Authorization: Bearer <token>`
- Chess stream:
  - `GET /run/chess?mode=auto` (Bearer token required)
  - `Content-Type: application/x-ndjson`
  - Event lines expected by the UI:
    - `{ "type": "event", "ply": number, "uci": string, "player": string, "reasoning"?: string, "centipawns_total"?: number, "centipawns_current"?: number, "latency_ms"?: number }`
    - `{ "type": "log", "message": string }`
    - `{ "type": "end" }`

### Important data-truth note

The sandbox treats streamed NDJSON as authoritative.  
Some summary values (e.g. elapsed duration and game outcome) are inferred client-side from the streamed move sequence when the backend does not send an explicit summary payload.

## Build

```bash
npm run build
```

Output: `build/`.

## Test the frontend

### 1. Fastest check: sample results viewer

This does not require the backend.

```powershell
cd Z:\capstone\frontend
npm.cmd install
npm.cmd run dev
```

Then:

1. Open `http://localhost:3000`
2. Click **View Sample Run**
3. Click **Replay sample**
4. Verify the board advances move-by-move, the move log fills in, evaluation / latency cards update, and the results dialog appears at the end

Sample payload used by the UI:

- `public/samples/chess-auto-sample.json`

### 2. Live backend integration

1. Start the Flask backend on port `8080`
2. Set `VITE_API_BASE_URL=/api` in `.env` for local proxy mode
3. Run the frontend:

```powershell
cd Z:\capstone\frontend
npm.cmd run dev
```

4. Open `http://localhost:3000`
5. Sign in or create an account
6. Open **Chess Strategy**
7. Click **Start live stream**
8. Verify:
   - board updates from backend UCI events
   - move log shows `ply`, `uci`, `player`, `reasoning`
   - metric cards show `centipawns_total`, `centipawns_current`, and `latency_ms`
   - results dialog opens when the backend sends the end marker

### 3. Account creation troubleshooting

If sign up fails, check the backend response code/message:

- `auth.username_exists` → username already taken
- `auth.registration_disabled` → backend registration flag disabled
- `auth.invalid_payload` → missing username/password

The frontend now surfaces these codes with user-friendly messages.  
If you still see a generic connection error, verify backend URL/CORS and that Flask is running on `:8080`.
