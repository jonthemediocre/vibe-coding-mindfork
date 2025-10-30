# MindFork Emulator Crash Root Cause Report

## Summary
- **Issue**: Android emulator showed blank screen (no splash/logo) and the MindFork app terminated immediately after launch.
- **Root Causes**:
  1. **Metro dev server never started** because TCP port `8081` was occupied by Docker (`card-trader-cadvisor`), so `expo run:android` skipped launching Metro and the dev client received no JS bundle.
  2. After freeing the port, Metro failed with `ENOSPC` watcher errors because `fs.inotify.max_user_watches` (65,536) and `fs.inotify.max_user_instances` (128) were too low for the monorepo, preventing bundle generation.
  3. Once Metro ran, the bundle crashed at runtime with `ReferenceError: Property 'TextDecoder' doesn't exist` in Hermes, leaving the emulator on a blank screen.

## Evidence
- Port ownership: `apps/mobile/logs/port-8081-processes.txt`.
- Watcher failure: `apps/mobile/logs/metro-watchers-error.log:114`.
- Hermes runtime crash (pre-fix): `apps/mobile/logs/expo-run-android-before-textdecoder.log:43-51`.
- Successful launch after fixes: `apps/mobile/logs/expo-run-android-success.log:24-36` and `adb logcat` (no TextDecoder errors).

## Reproduction Checklist
1. Start Docker stack that binds host port `8081`.
2. Run `cd apps/mobile && npx expo run:android --variant debug` on Node 22 / Hermes.
3. Observe Metro prompt for new port; with `EXPO_USE_PORT=8082` it attempts to start Metro.
4. Without raising inotify limits, Metro exits with `ENOSPC` error.
5. Even if Metro starts manually, Hermes throws `ReferenceError: Property 'TextDecoder' doesn't exist` on launch.

## Remediation Actions
1. Stopped Docker container `card-trader-cadvisor` to free port `8081` (`docker stop card-trader-cadvisor`).
2. Raised watcher limits:
   - `sudo sysctl -w fs.inotify.max_user_watches=524288`
   - `sudo sysctl -w fs.inotify.max_user_instances=1024`
   - **Recommendation**: persist in `/etc/sysctl.d/99-metro.conf` to survive reboots.
3. Installed `text-encoding-polyfill@0.6.7` and imported it in `apps/mobile/index.js` to provide `TextDecoder` for Hermes.
4. Relaunched with `EXPO_USE_PORT=8081 npx expo run:android --variant debug`—Metro runs, bundle builds, emulator loads MindFork without crashing.

## Remaining Risks / Follow-ups
- Persist the sysctl changes to avoid reverting after reboot.
- Ensure Docker compose files avoid binding `8081` when running mobile dev flows, or set `EXPO_USE_PORT` to an alternate default (documented below).
- Consider scripting a health check in `run-on-emulator.sh` to detect port conflicts and watcher limits automatically.

## Operational Notes
- Preferred command sequence:
  ```bash
  export EXPO_USE_PORT=8081
  cd apps/mobile
  npx expo run:android --variant debug
  ```
- If port conflicts reappear, `npx expo start --dev-client --port 8081` will now run cleanly thanks to raised watcher limits.
