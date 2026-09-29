'use strict'

const { execFileSync } = require('node:child_process')

const args = process.argv.slice(2)
let message = 'chore: update media controller'

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === '--message' || args[index] === '-m') {
    message = args[index + 1] || message
    index += 1
  }
}

function run (command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.stdio || 'pipe'
  })
}

const status = run('git', ['status', '--porcelain']).trim()
if (!status) {
  console.log('No changes to commit.')
  process.exit(0)
}

run(process.execPath, ['--check', 'media-controller.user.js'], { stdio: 'inherit' })
run('git', ['add', '--all'], { stdio: 'inherit' })

try {
  run('git', ['diff', '--cached', '--quiet'])
  console.log('No staged changes to commit.')
  process.exit(0)
} catch (_) {
  // `git diff --cached --quiet` exits 1 when staged changes exist.
}

run('git', ['commit', '-m', message], { stdio: 'inherit' })
