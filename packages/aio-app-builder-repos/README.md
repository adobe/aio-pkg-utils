# aio-app-builder-repos

Node module returning the metadata of all the repos Adobe Developer App Builder uses. This list is used in various tooling.

Format of the data:

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
