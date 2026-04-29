#!/usr/bin/env node

import { createCli } from '../src/index.js'

const cli = createCli()
cli.parse(process.argv)
