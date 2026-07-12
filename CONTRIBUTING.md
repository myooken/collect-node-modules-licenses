# Contributing Guide

## Development

The package has zero dependencies; cloning is enough (no `npm install` needed).

- Run the test suite (golden tests; Node >= 18):

```sh
npm test
```

- Regenerate the golden snapshots after an intentional output change:

```sh
UPDATE_SNAPSHOTS=1 npm test
```

- Check the hand-written type definitions against the implementation
  (TypeScript is fetched via npx; the package itself stays dependency-free):

```sh
npm run test:types
```

- Preview what would be included in the npm package:

```sh
npm pack --dry-run
```

## Release process (maintainers)

Releases are published **automatically from GitHub Actions** via npm
[trusted publishing](https://docs.npmjs.com/trusted-publishers) with a
provenance attestation. Do **not** run `npm publish` locally — it would
fail (`publishConfig.provenance` requires a CI environment) and would
bypass the provenance guarantee.

1. Bump the version on a branch and open a PR:

```sh
npm version patch --no-git-tag-version   # or minor / major
```

> - patch: 1.1.0 → 1.1.1
> - minor: 1.1.0 → 1.2.0
> - major: 1.1.0 → 2.0.0

2. Merge the PR (squash), then tag the release commit on `main`.
   The tag must be `v` + the exact `package.json` version — the workflow
   fails on a mismatch:

```sh
git checkout main && git pull
git tag v1.2.0
git push origin v1.2.0
```

3. Pushing the `v*` tag triggers `.github/workflows/release.yml`, which
   runs `npm test` and `npm run test:types`, then publishes to npm with
   provenance. No npm token is involved; authentication uses OIDC via the
   Trusted Publisher configured on npmjs.com (repository
   `myooken/collect-node-modules-licenses`, workflow `release.yml`).

4. Create a GitHub Release for the tag with the release notes.

## Error handling

If a required file is missing, the command prints an error message and exits with code 1.
