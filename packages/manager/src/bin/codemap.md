# `bin/` — CLI Entrypoint

## Responsibility
Provides the executable entrypoint to start the Scramjet Manager process.

## Modules

### `start.ts` (11 lines)
Minimal launcher:
```typescript
import { startManager } from "../lib/start-manager";
startManager().catch(e => {
    console.error(e.stack);
    process.exitCode = e.exitCode || 1;
    process.exit();
});
```
- Imported by `package.json` script `"start": "ts-node ./src/bin/start"`.
- `startManager()` (defined in `src/lib/start-manager.ts`) creates a `Manager` instance and calls `manager.main()` — which creates a `ManagerAPIHandler` and attaches both v1 and v2 routes.
- Catches startup errors and exits with the appropriate code.

## Integration Points
- Calls into `start-manager.ts` which imports `Manager` from `lib/manager.ts`.
- The `Manager` constructor reads `build.info.json` and `package.json` for version/build metadata.
