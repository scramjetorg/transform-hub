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
- `startManager()` (defined in `src/lib/start-manager.ts`) instantiates `Manager` and calls `manager.main()`.
- Catches startup errors and exits with the appropriate code.
