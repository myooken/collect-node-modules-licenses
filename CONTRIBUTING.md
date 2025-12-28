# Contributing Guide

## npm update

- npm login

```sh
npm login
```

- check account

```sh
npm whoami
```

- check before upload package

```sh
npm pack --dry-run
```

- version update

```sh
npm version patch
npm version minor
npm version major
```

> - patch: 0.1.0 → 0.1.1
> - minor: 0.1.0 → 0.2.0
> - major: 0.1.0 → 1.0.0

- publish

```sh
npm publish --access public
```

## Error handling

If a required file is missing, the command prints an error message and exits with code 1.
