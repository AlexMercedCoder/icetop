# Pre-Release Checklist

A checklist for preparing, testing, and shipping a new release of IceTop.

---

## 1. Version Numbers

Update **all** of these:

- [ ] `package.json` → `"version": "X.Y.Z"`

## 2. Dependency Audit

### Python Backend (`python/requirements.txt`)

- [ ] Run `grep -rn "^import\|^from" python/ --include="*.py"` and cross-reference every third-party import against `requirements.txt`
- [ ] Check for **new** transitive dependencies:
  ```bash
  python3 -m venv /tmp/clean-env
  source /tmp/clean-env/bin/activate
  pip install -r python/requirements.txt
  pip freeze > /tmp/full-deps.txt
  ```
  Review `/tmp/full-deps.txt` for any new packages that PyInstaller might not auto-discover.
- [ ] If `iceframe` was upgraded, check if it pulls in new native deps

### Frontend (`package.json`)

- [ ] Run `npm ci` from a clean state (delete `node_modules/` first) — verify no install errors

## 3. PyInstaller Hidden Imports

> **This is the #1 source of production crashes.** PyInstaller cannot auto-detect dynamically imported modules. Any missing hidden import causes a silent crash.

### How to verify

1. Build the backend locally:
   ```bash
   bash scripts/bundle-backend.sh
   ```
2. Run the binary directly (it expects JSON-RPC on stdin):
   ```bash
   echo '{"id":"1","method":"ping","params":{}}' | ./backend-dist/icetop-backend
   ```
   Should return: `{"id":"1","result":"pong"}`

### Common categories of missing imports

| Category | Examples | Why PyInstaller Misses Them |
|---|---|---|
| **New transitive deps** | `polars`, `pyiceberg` sub-modules | Pulled in by upgraded libraries |
| **Dynamic sub-modules** | `pyiceberg.catalog.rest`, `pyiceberg.io.*` | Loaded at runtime |
| **LLM SDKs** | `openai`, `anthropic`, `google.generativeai` | Lazily imported in `agent.py` |
| **C extensions** | `polars`, `pydantic_core`, `orjson` | Native code PyInstaller can miss |

### When to update hidden imports

Update **both** of these files whenever adding a new Python dependency:

- `scripts/bundle-backend.sh` (Unix build)
- `.github/workflows/build.yml` (Windows build section)

Use `--collect-submodules=<package>` for packages with many dynamic sub-imports.

## 4. Local Build & Test

### Backend binary (~5 min)

- [ ] `bash scripts/bundle-backend.sh`
- [ ] Test: `echo '{"id":"1","method":"ping","params":{}}' | ./backend-dist/icetop-backend`
- [ ] Verify output: `{"id":"1","result":"pong"}`

### Full Electron app (~10 min)

- [ ] `npm run build && npx electron-builder --linux`  (or `--mac` / `--win`)
- [ ] Install the produced `.deb`/`.dmg`/`.exe`
- [ ] Launch from terminal to see logs:
  ```bash
  /usr/lib/icetop/icetop 2>&1 | tee /tmp/icetop-log.txt
  ```
- [ ] Confirm logs show: `[Python] Backend ready`
- [ ] Open DevTools (`Ctrl+Shift+I`) — verify no errors

## 5. CI/CD Verification

- [ ] Confirm `.github/workflows/build.yml` triggers on `v*` tags
- [ ] Verify the build matrix covers all target platforms
- [ ] Confirm `python-version` matches local testing version
- [ ] Verify the Windows PyInstaller section matches `bundle-backend.sh`

## 6. Git & Release

- [ ] Merge feature branch into `main`
- [ ] `git push origin main`
- [ ] `git tag vX.Y.Z && git push origin vX.Y.Z`
- [ ] Monitor GitHub Actions — all 4 platform jobs should pass
- [ ] Download and smoke-test at least the Linux artifact

### Re-releasing the same version

```bash
git tag -d vX.Y.Z                      # delete local tag
git push origin :refs/tags/vX.Y.Z      # delete remote tag
# make fixes, commit, push
git tag vX.Y.Z && git push origin vX.Y.Z  # recreate tag
```

> **Note:** If a GitHub Release was already created, delete it from the GitHub UI first.

## 7. Debugging a Failed Production Build

If the app opens but shows errors or Python backend isn't responding:

1. The PyInstaller binary is crashing. Find it:
   ```bash
   find /usr/lib /opt -name "icetop-backend" -type f 2>/dev/null
   ```
2. Run it directly:
   ```bash
   echo '{"id":"1","method":"ping","params":{}}' | /path/to/icetop-backend
   ```
3. Run the full Electron app from terminal:
   ```bash
   /usr/lib/icetop/icetop 2>&1
   ```
4. Check for stale processes:
   ```bash
   pgrep -a -f icetop-backend
   pkill -f icetop-backend
   ```
