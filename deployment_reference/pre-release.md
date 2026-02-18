# Pre-Release Checklist

A checklist for preparing, testing, and shipping a new release of Dremio Desktop.

---

**DOUBLE CHECK THE DOCS PAGE REFLECTS CURRENT FEATURE SET**

## 1. Version Numbers

Update **all** of these (they are easy to miss):

- [ ] `package.json` → `"version": "X.Y.Z"`
- [ ] `src/components/Layout.jsx` → footer version string
- [ ] `src/components/DocsPage.jsx` → footer version string
- [ ] `build.md` → git tag example (documentation only, not functional)
- [ ] `desktop-prd.md` → add a "Added in vX.Y" changelog section

## 2. Dependency Audit

### Python Backend (`backend/requirements.txt`)

- [ ] Run `grep -rn "^import\|^from" backend/ --include="*.py"` and cross-reference every third-party import against `requirements.txt`
- [ ] Check for **new** transitive dependencies by creating a clean virtualenv:
  ```bash
  python3 -m venv /tmp/clean-env
  source /tmp/clean-env/bin/activate
  pip install -r backend/requirements.txt
  pip freeze > /tmp/full-deps.txt
  ```
  Review `/tmp/full-deps.txt` for any new packages that PyInstaller might not auto-discover.
- [ ] If `dremio-simple-query` was upgraded, check if it pulls in new native deps (e.g., `duckdb`, `polars`)

### Frontend (`package.json`)

- [ ] Run `npm ci` from a clean state (delete `node_modules/` first) — verify no install errors

## 3. PyInstaller Hidden Imports

> **This is the #1 source of production crashes.** PyInstaller cannot auto-detect dynamically imported modules. Any missing hidden import causes a silent crash → the Electron app falls back to `localhost:8000` → ERR_CONNECTION_REFUSED.

### How to verify

1. Build the backend locally:
   ```bash
   bash scripts/bundle-backend.sh
   ```
2. Run the binary directly:
   ```bash
   ./backend-dist/backend-sidecar --port 8111
   ```
3. Test the health endpoint:
   ```bash
   curl http://127.0.0.1:8111/health
   # Should return: {"status":"ok"}
   ```

### Common categories of missing imports

| Category | Examples | Why PyInstaller Misses Them |
|---|---|---|
| **New transitive deps** | `duckdb`, `polars`, `tiktoken` | Pulled in by upgraded libraries, not directly imported |
| **Async framework** | `anyio`, `sniffio`, `httpx`, `httpcore`, `h11` | Used internally by FastAPI/Starlette/OpenAI SDK |
| **Dynamic sub-modules** | `starlette.*`, `tiktoken_ext.*` | Loaded at runtime via `importlib` or lazy imports |
| **C extensions** | `greenlet`, `orjson`, `cryptography` | Native code that PyInstaller's analysis can miss |
| **Protocol backends** | `websockets`, `uvicorn.loops.auto` | Selected at runtime based on platform |

### When to update hidden imports

Update **both** of these files whenever adding a new Python dependency:

- `scripts/bundle-backend.sh` (Unix build)
- `.github/workflows/build.yml` (Windows build section)

Use `--collect-submodules=<package>` for packages with many dynamic sub-imports (e.g., `tiktoken`, `starlette`).

## 4. Local Build & Test

### Backend binary (fast — ~5 min)

- [ ] `bash scripts/bundle-backend.sh`
- [ ] `./backend-dist/backend-sidecar --port 8111` — verify it starts and logs `Uvicorn running on http://127.0.0.1:8111`
- [ ] `curl http://127.0.0.1:8111/health` → `{"status":"ok"}`
- [ ] Kill the binary (`Ctrl+C`)

### Full Electron app (slower — ~10 min)

- [ ] `npm run make:linux` (or `make:mac` / `make:win`)
- [ ] Install the produced `.deb`/`.dmg`/`.exe`
- [ ] Launch the installed app from terminal to see main-process logs:
  ```bash
  /usr/lib/dremio-desktop/dremio-desktop 2>&1 | tee /tmp/electron-log.txt
  ```
- [ ] Confirm logs show:
  - `[Sidecar] Backend is ready!`
  - `[Main] Sidecar ready on port XXXXX`
  - HTTP 200 responses for `/health`, `/charts`, `/facts`, `/system/config`
- [ ] Open DevTools in the app (`Ctrl+Shift+I`) and verify no `ERR_CONNECTION_REFUSED` errors pointing to `localhost:8000`

### Stale process cleanup

Before testing, always kill lingering sidecar processes:
```bash
pkill -f backend-sidecar
```

## 5. CI/CD Verification

- [ ] Confirm `.github/workflows/build.yml` triggers on `v*` tags
- [ ] Verify the build matrix covers all target platforms (macOS ARM, macOS Intel, Windows, Linux)
- [ ] Confirm `python-version` in the matrix matches the version used for local testing
- [ ] Verify the Windows PyInstaller section in `build.yml` matches `bundle-backend.sh` (they are maintained separately and can drift)

## 6. Git & Release

- [ ] Merge feature branch into `main` (fast-forward preferred)
- [ ] `git push origin main`
- [ ] `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] Monitor the GitHub Actions build — all 4 platform jobs should pass
- [ ] Download and smoke-test at least the Linux artifact before announcing

### If you need to re-release the same version

```bash
git tag -d vX.Y.Z                      # delete local tag
git push origin :refs/tags/vX.Y.Z      # delete remote tag
# make fixes, commit, push
git tag vX.Y.Z && git push origin vX.Y.Z  # recreate tag
```

> **Note:** If a GitHub Release was already created, delete it manually from the GitHub UI before re-pushing the tag.

## 7. Debugging a Failed Production Build

If the installed app shows `ERR_CONNECTION_REFUSED` pointing to `localhost:8000`:

1. **The sidecar binary is crashing.** The frontend falls back to port 8000 when IPC returns port 0.
2. **Find the installed binary:**
   ```bash
   find /usr/lib /opt -name "backend-sidecar" -type f 2>/dev/null
   ```
3. **Run it directly** to see the actual error:
   ```bash
   /usr/lib/dremio-desktop/resources/backend-dist/backend-sidecar --port 8111
   ```
4. **Run the full Electron app** from terminal to see main-process logs:
   ```bash
   /usr/lib/dremio-desktop/dremio-desktop 2>&1
   ```
5. **Check for stale processes** that may be blocking ports:
   ```bash
   pgrep -a -f backend-sidecar
   pkill -f backend-sidecar
   ```
