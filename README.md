# Scramjet Cloud Server Instance (CSI)

## Installation

```bash
npm install -g lerna yarn
```

```bash
yarn link
```

```bash
yarn install
```

It'll install all dependencies at once.

## Publish

Create a new release of the packages that have been updated.
Prompts for a new version and updates all the packages on git and npm.

```bash
lerna publish
```

```bash
yarn publish
```

## Commands

Build all packages

```bash
yarn build
```

Remove all files in `*dist/*` directory

```bash
yarn clean
```

Check and fix syntax

```bash
yarn lint
```

Watch files

```bash
yarn watch
```

Test files

```bash
yarn test
```

Test files parallel

```bash
yarn test:parallel
```

BDD Test

```bash
yarn test:bdd
```

Run script excluding package

```bash
lerna run --ignore @scramjet/<package_name> build
```

```bash
lerna run --ignore @scramjet/<package_name> build && @scramjet/<package_name> build
```

Run script only in one package

```bash
lerna run --scope @scramjet/<package_name> <script-name>
```

<!-- 
- `npm run build` - build all services, samples etc.,
- `npm run build:supervisor` - build only supervisor,
- `npm run clean` - remove all files in *dist/* directory,
- `npm run lint` - check files
 -->

---

Add new package

```bash
lerna create package_name
```

List all of the public packages in the current Lerna repo.

```bash
lerna ls
```

Bootstrap the packages in the current Lerna repo. Installing all their dependencies and linking any cross-dependencies.

```bash
lerna bootstrap
```

Add external dependency

```bash
lerna add <dependency_name> --scope=@scope_name/package_name
```

Add internal dependency

```bash
lerna add @scope_name/package_name --scope=@scope_name/package_name
```

Import the package in the local path `<pathToRepo>` into `packages/<directory-name>` with commit history.

```bash
lerna import <pathToRepo>
```

Run an npm script in each package that contains that script.

```bash
lerna run [script]
```

## Documentation

Want to check out more? [See the doc =>](https://github.com/scramjet-cloud-platform/docs)
