# @adobe/ab-app-secrets-uploader

CLI tool that reads an Adobe App Builder project's OAuth credentials and runtime config from `aio config`, formats them as GitHub-ready environment variables, and optionally creates the matching GitHub environment.

Inspired by and improves on the approach described in [CI/CD using GitHub Actions](https://developer.adobe.com/app-builder/docs/guides/app_builder_guides/deployment/cicd-using-github-actions).

## Prerequisites

- Node.js >= 24
- [Adobe I/O CLI](https://github.com/adobe/aio-cli): `npm install -g @adobe/aio-cli`
- [GitHub CLI](https://cli.github.com): `brew install gh`
- An App Builder workspace with the **I/O Management API** service added
- `aio app use` already run so `aio config` contains valid credentials

## Installation

```sh
npm install -g @adobe/ab-app-secrets-uploader
```

## Commands

### `create-env <output-file>`

Fetches secrets from `aio config` and writes them to a file, then prints the `gh` commands needed to upload them. No secrets are uploaded automatically — you run the printed commands yourself.

```
ab-app-secrets-uploader create-env <output-file> [options]
```

| Flag | Description |
|------|-------------|
| `--no-suffix` | Omit the `_PROD` / `_STAGE` suffix (use when targeting a GitHub environment) |

**Examples**

```sh
# Suffix mode — repo-level secrets
ab-app-secrets-uploader create-env secrets.env
gh secret set -f secrets.env

# GitHub Environments mode
ab-app-secrets-uploader create-env secrets.env --no-suffix
gh api -X PUT repos/{owner}/{repo}/environments/stage
gh secret set -f secrets.env --env stage
```

If `<output-file>` already exists, you will be prompted to confirm before overwriting.

### `upload`

Fetches secrets from `aio config` and uploads them directly as GitHub secrets after interactive confirmation. No file is written.

```
ab-app-secrets-uploader upload [options]
```

| Flag | Description |
|------|-------------|
| `--no-suffix` | Omit the `_PROD` / `_STAGE` suffix (use when targeting a GitHub environment) |

**Examples**

```sh
# Suffix mode — repo-level secrets
ab-app-secrets-uploader upload
# → prompts: Upload secrets to this GitHub repo? (y/N)

# GitHub Environments mode
ab-app-secrets-uploader upload --no-suffix
# → prompts: Create 'stage' environment in this GitHub repo? (y/N)
# → prompts: Upload secrets to the 'stage' environment in this GitHub repo? (y/N)
```

## The `--no-suffix` flag

By default, variable names include a suffix so both workspaces can coexist in the same repository as repo-level secrets (`CLIENTID_STAGE`, `CLIENTID_PROD`, …). Use `--no-suffix` when you want secrets scoped to a GitHub **environment** instead — names are bare (`CLIENTID`, `CLIENTSECRET`, …) and the environment name is derived automatically:

| Workspace name | GitHub environment |
|----------------|--------------------|
| `Production`   | `production`       |
| anything else  | `stage`            |

## Generated variables

The following variables are written (shown without suffix):

| Variable | Source |
|----------|--------|
| `CLIENTID` | OAuth client ID |
| `CLIENTSECRET` | OAuth client secret (first) |
| `TECHNICALACCID` | Technical account ID |
| `TECHNICALACCEMAIL` | Technical account email |
| `IMSORGID` | IMS org ID |
| `SCOPES` | OAuth scopes (comma-separated) |
| `AIO_RUNTIME_NAMESPACE` | Runtime namespace |
| `AIO_RUNTIME_AUTH` | Runtime auth token |
| `AIO_PROJECT_ID` | Project ID |
| `AIO_PROJECT_NAME` | Project name |
| `AIO_PROJECT_ORG_ID` | Org ID |
| `AIO_PROJECT_WORKSPACE_ID` | Workspace ID |
| `AIO_PROJECT_WORKSPACE_NAME` | Workspace name |
| `AIO_PROJECT_WORKSPACE_DETAILS_SERVICES` | Services JSON |

## Development

```sh
npm test          # run vitest with coverage
npm run lint      # eslint
npm run lint:fix  # eslint --fix
```

## License

Apache-2.0
