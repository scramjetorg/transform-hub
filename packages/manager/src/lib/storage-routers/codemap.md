# `storage-routers/` — Sequence Storage Backends

## Responsibility
Provides two alternative implementations (S3-compatible and local disk) for storing and retrieving uploaded sequence packages. Both share the same router-based API surface and are selected at runtime by `s3-router.ts`; Manager v1/v2 storage routes proxy to these routers for upload, retrieval, deletion, index reads, and store clearing.

## Modules

### `disk-proxy.ts` — `DiskProxy` class (334 lines)
Filesystem-backed sequence store. Key aspects:
- Uses `DiskClient` (internal helper) wrapping `fs/promises` operations: `statObject`, `getObject`, `putObject`, `removeObject`, `getText`.
- Maintains a `SequenceIndex` (`{sequences, size, version}`) persisted as `index.json` on disk under `/<bucket>/<id>/`.
- **Router endpoints** (mounted at `${base}`):
  - `GET /:directory/:filename?` — retrieve stored sequence.
  - `DELETE /:filename` — delete sequence, update index.
  - `PUT /:filename?` — accept uploaded package stream, identify via `ProcessSequenceAdapter.identify()`, enforce `bucketLimit`.
  - `GET /` — return full sequence index.
- Uses `ProcessSequenceAdapter` from `@scramjet/adapter-process` for package identification.
- Persists metadata alongside each file as `<filename>.metadata`.
- `saveIndex()` tolerates partially failed removals so clear/delete operations keep the index consistent with surviving files.

### `s3-proxy.ts` — `S3Proxy` class (264 lines)
Minio S3-compatible sequence store. Structurally mirrors `DiskProxy` but uses a Minio `Client`:
- **`loadIndex()`/`saveIndex()`**: Downloads/uploads `index.json` from S3 bucket with retry logic.
- **Router endpoints** (same shape as `DiskProxy`): GET, DELETE, PUT, GET /.
- Index version migration detects array-format legacy indexes and upgrades to `{sequences, size, version}`.
- Store clear/delete operations share the same index mutation contract as the disk backend and return storage-operation responses to the Manager API layer.

## Shared Types
Both proxies define the same internal types:
```typescript
type SequenceInfo = Awaited<ReturnType<ISequenceAdapter["identify"]>> & {
    _filename: string;
    _fileId: string;
};
type SequenceIndex = {
    sequences: SequenceInfo[];
    size: number;
    version: string;
};
```
