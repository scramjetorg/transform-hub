# Scramjet Cloud Server Instance (CSI)

## Installation

```bash
npm install -g lerna
```

```bash
npm i
```

It'll install all dependencies at once.

## Publish

```bash
npm run publish
```

## Commands

- `npm run build` - build all services, samples etc.,
- `npm run build:supervisor` - build only supervisor,
- `npm run clean` - remove all files in *dist/* directory,
- `npm run lint` - check files

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

Import the package in the local path <pathToRepo> into packages/<directory-name> with commit history.
```bash
lerna import <pathToRepo>
```

Run an npm script in each package that contains that script.
```bash
lerna run [script]
```

Create a new release of the packages that have been updated.
Prompts for a new version and updates all the packages on git and npm.
```bash
lerna publish
```

## Documentation

Want to check out more? [See the doc =>](https://github.com/scramjet-cloud-platform/docs)
