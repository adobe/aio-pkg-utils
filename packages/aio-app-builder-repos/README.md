# aio-app-builder-repos

Node module returning the metadata of all the repos Adobe Developer App Builder uses. This list is used in various tooling.

## Format of the Data

```json
{
  "defaultHost": "https://github.com",
  "defaultJiraProject": "ACNA",
  "repos": [
    { "repo": "adobe/aio-cli", "components": ["CLI"] },
    { "repo": "adobe/aio-cli-setup-action", "components": ["CLI"],  "jira_project": "ACNA" }
  ]
}
```

## Install

`npm install @adobe/aio-app-builder-repos`

## Usage

```javascript
const { defaultHost, defaultJiraProject, repos } = require('@adobe/aio-app-builder-repos')

repos.forEach(item => console.log(item.repo))
```
