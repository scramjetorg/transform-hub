# `storage-routers/` — Sequence Storage Backends

## Responsibility
Provides two alternative implementations (S3-compatible and local disk) for storing and retrieving uploaded sequence packages. Both share the same router-based API surface and are selected at runtime by `s3-router.ts`.

## Modules

### `disk-proxy.ts` — `DiskProxy` class (334 lines)
Filesystem-backed sequence store. Key aspects:
- Uses `DiskClient` (internal helper) wrapping `fs/promises` operations: `statObject`, `getObject`, `putObject`, `removeObject`, `getText`.
- Maintains a `SequenceIndex` (`{sequences, size, version}`) persisted as `index.json` on disk under `/<bucket>/<id>/`.
- **Router endpoints** (mounted at `${base}`):
  - `GET /:directory/:filename?` — retrieve a stored sequence by filename.
  - `DELETE /:filename` — delete a sequence by filename or fileId, update index.
  - `PUT /:filename?` — accept an uploaded package stream, identify it via `ProcessSequenceAdapter.identify()`, enforce `bucketLimit` storage cap, write to disk, add to index.
  - `GET /` — return the full sequence index.
- Uses `ProcessSequenceAdapter` from `@scramjet/adapter-process` for package identification (entrypoint, name, config, etc.).
- Persists metadata alongside each file as `<filename>.metadata`.

### `s3-proxy.ts` — `S3Proxy` class (264 lines)
Minio S3-compatible sequence store. Structurally mirrors `DiskProxy` but uses a Minio `Client` instead of `DiskClient`:
- **`loadIndex()`**: Downloads `index.json` from the S3 bucket; creates an empty one if not found.
- **`saveIndex()`**: Uploads the index to S3 with retry logic and 5-second timeout.
- **Router endpoints** (same shape as `DiskProxy`):
  - `GET /:directory/:filename?` — stream from S3 via `s3Client.getObject()`.
  - `DELETE /:filename` — remove from S3, update index.
  - `PUT /:filename?` — upload to S3 via `s3Client.putObject()` with callback API.
  - `GET /` — return index.
- Index version migration: detects array-format legacy indexes and upgrades to the current `{sequences, size, version}` format.

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
