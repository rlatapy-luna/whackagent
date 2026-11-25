import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code/testing'

const CONFIG = '---\nbacklog:\n  provider: github\nbranch:\n  prefix: feature/\n---\n'
const RED = '❌ HingeRule: new type named in no Changes fold\n'

function world(on: On, options: { config?: string; prHead?: string; check?: 'red' | 'green' | 'crash' } = {}) {
  const state = { ran: [] as string[], checked: [] as string[] }
  const run = (exitCode: number, stdout: string) => ({
    value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
  })
  on('session.root', () => ({ value: '/p' }))
  on('session.cwd', () => ({ value: '/p' }))
  on('fs.read', ($, e) =>
    e.path === '/p/.lunabee/agents/config.md' && options.config !== '' ? { value: options.config ?? CONFIG } : { deny: `ENOENT ${e.path}` },
  )
  on('process.run', ($, e) => {
    const argv = e.argv.join(' ')
    if (argv === 'git rev-parse --show-toplevel') return run(0, '/p\n')
    if (argv === 'git rev-parse --abbrev-ref HEAD') return run(0, 'feature/12-login\n')
    if (argv.startsWith('gh pr view')) return run(0, JSON.stringify({ headRefName: options.prHead ?? 'feature/12-login', baseRefName: 'develop' }))
    if (argv.startsWith('python3 ') && argv.includes('/scripts/pr-check check')) {
      state.checked.push(e.argv.slice(-2).join(' '))
      if (options.check === 'crash') throw new Error('python3 missing')
      return options.check === 'red' ? run(1, `base: develop\n${RED}`) : run(0, '✅ body covers the diff\n')
    }
    return run(1, '')
  })
  on('tool.call', { tool: 'Bash' }, ($, e) => {
    state.ran.push(e.command)
    return { result: { stdout: '', stderr: '' } }
  })
  return state
}

test('the ticket PR body is checked before publishing, a red one refused', async ($, on) => {
  const state = world(on, { check: 'red' })
  const done = await $.tool.call({ tool: 'Bash', command: 'gh pr create --draft --base develop --body-file body.md' })
  expect('deny' in done && done.deny).toContain(RED.trim())
  expect(state.checked).toEqual(['/p/body.md develop'])
  expect(state.ran).toEqual([])
})

test('a green body is published, the edit checked against the PR base', async ($, on) => {
  const state = world(on, { check: 'green' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr edit 34 --body-file /tmp/body.md' })
  expect(state.checked).toEqual(['/tmp/body.md develop'])
  expect(state.ran).toEqual(['gh pr edit 34 --body-file /tmp/body.md'])
})

test('inline and stdin bodies are refused on the ticket PR', async ($, on) => {
  const state = world(on)
  const inline = await $.tool.call({ tool: 'Bash', command: 'gh pr create --base develop --body "Intro."' })
  const stdin = await $.tool.call({ tool: 'Bash', command: "gh pr edit 34 --body-file - <<'EOF'\nIntro.\nEOF" })
  expect('deny' in inline && inline.deny).toContain('--body-file <file>')
  expect('deny' in stdin && stdin.deny).toContain('stdin')
  expect(state.ran).toEqual([])
})

test('another branch\'s PR, a project without config, a call without body: untouched', async ($, on) => {
  const state = world(on, { check: 'red', prHead: 'develop' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr edit 7 --body-file old-markers.md' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr edit 34 --add-assignee @me' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --base develop --head sprint/3 --body-file sprint.md' })
  expect(state.checked).toEqual([])
  expect(state.ran.length).toBe(3)
})

test('no config: inline body passes', async ($, on) => {
  const state = world(on, { config: '' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --body "x"' })
  expect(state.ran).toEqual(['gh pr create --body "x"'])
})

test('the guard failing lets the call run', async ($, on) => {
  const state = world(on, { check: 'crash' })
  await $.tool.call({ tool: 'Bash', command: 'gh pr create --base develop --body-file body.md' })
  expect(state.ran).toEqual(['gh pr create --base develop --body-file body.md'])
})
