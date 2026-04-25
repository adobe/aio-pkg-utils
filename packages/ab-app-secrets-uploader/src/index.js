import { Command } from 'commander'

export function createCli () {
  const program = new Command()

  program
    .name('ab-app-secrets-uploader')
    .description('CLI tool for uploading App Builder app secrets')
    .version('0.1.0')

  program
    .command('upload')
    .description('Upload secrets for an App Builder app')
    .option('-e, --env <file>', 'path to .env file', '.env')
    .option('-a, --app-id <id>', 'App Builder app ID')
    .action((options) => {
      console.log('upload command - not yet implemented', options)
    })

  return program
}
