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

## Usage

```
ab-app-secrets-uploader upload [output-file] [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--no-suffix` | Omit the `_PROD` / `_STAGE` suffix from variable names (use when targeting a GitHub environment) |
| `-V, --version` | Print version |
| `-h, --help` | Show help |

### Examples

**Print env vars to stdout (suffix mode)**

```sh
ab-app-secrets-uploader upload
```

Outputs variables like `CLIENTID_STAGE`, `CLIENTSECRET_STAGE`, … and prints a `gh secret set` hint.

**Write to a file**

```sh
ab-app-secrets-uploader upload secrets.env
gh secret set -f secrets.env
```

**GitHub Environments mode (`--no-suffix`)**

Use this when you want secrets scoped to a specific GitHub environment instead of the whole repository. Variable names are bare (`CLIENTID`, `CLIENTSECRET`, …).

```sh
ab-app-secrets-uploader upload secrets.env --no-suffix
# → writes secrets.env
# → prints: gh secret set -f secrets.env --env stage
# → prompts: Create 'stage' environment in this GitHub repo? (y/N)
```

The environment name is determined automatically:

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
