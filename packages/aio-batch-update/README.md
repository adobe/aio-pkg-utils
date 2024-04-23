# aio-batch-update 

Make batch changes across multiple repos using a Git patch

## Getting Started

### Pre-requisites 

- [git-xargs](https://github.com/gruntwork-io/git-xargs?tab=readme-ov-file#getting-started)
- Create classic github pat with `repo`, `workflow`, `gist`, and `user` scopes, export to local environment 
    ```
    export GITHUB_OAUTH_TOKEN=gph...
    ```

### Install Dependencies

`npm install` 

## Usage 

### Generate new Git patch 

- Make changes to a single repo locally
- Before committing, run `git diff > [some-name].patch`
- Add the new patch file to this repo for historical purposes

### Fill out batch update configuration

- Copy `update-config.example.json` to `update-config.json` 
- Fill out new config file
    - `branch` - name of branch to create
    - `commitMessage` - message to include in the commit
    - `repos` (optional) - list of github repos to apply patch to (if empty uses all active and non-documentation aio-app-builder-repo)
    - `patch` - name of the Git patch in `patches` folder to apply

### Run

⚠️ Use with care: If `repos` is empty, this will create a branch and open a pull request across 70+ repos

`npm run apply`
