# packages/cli/src/lib/helpers/

## Responsibility

Helper utility modules for CLI command implementations. Provides reusable logic for sequence management, instance operations, scope handling, developer tooling, and general utilities.

## Modules

| File | Role |
|------|------|
| `sequence.ts` | Sequence pack/send/start helpers: `sequencePack()` (tar creation with minimatch filtering), `sequenceSendPackage()`, `sequenceDelete()`, `sequenceParseArgs()`, `sequenceParseConfig()`, `sequenceStart()`. |
| `instance.ts` | Instance lifecycle helpers: `instanceKill()` (force-remove sequence instances), `instanceRestart()`. |
| `scope.ts` | Scope parsing and validation helpers. |
| `developerTools.ts` | Developer utility helpers (development mode only). |
| `various.ts` | General utility helpers (`getInfo`, `getHostApiBase`, etc.). |
| `messages.ts` | Reusable message/error string constants. |
| `isLinux.ts` | `isLinuxOS()` — platform detection for completion command availability. |

## Integration Points

- Consumed by command modules in `lib/commands/` for complex multi-step operations.
- `sequence.ts` uses `tar`, `minimatch`, `scramjet` streams, and `@scramjet/utility` for file packaging.
- `instance.ts` uses `@scramjet/api-client` `InstanceClient` for instance lifecycle management.
