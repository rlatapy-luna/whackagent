import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code/testing'

const CONFIG = '---\nbacklog:\n  provider: github\n---\n'
const CLAIM = 'python3 "$CLAUDE_PLUGIN_ROOT/providers/github/wa-backlog" claim 12 coding'

function world(on: On, session: string, store: Record<string, unknown> = {}) {
  const state = { reviews: [] as { id: string; author: { login: string }; state: string; body: string }[], commands: [] as string[], suggested: [] as string[], isMerged: false }
  on('session.root', () => ({ value: '/p' }))
  on('session.id', () => ({ value: session }))
  on('session.start', () => ({ cwd: '/p' }))
  on('command.register', () => ({ value: { command: 'wa-pane' } }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__whackagent__${e.name}` } }))
  on('fs.read', ($, e) => (e.path === '/p/.whackagent/config.md' ? { value: CONFIG } : { deny: `ENOENT ${e.path}` }))
  on('process.run', ($, e) => {
    const argv = e.argv.join(' ')
    const stdout = argv.startsWith('gh pr list')
      ? JSON.stringify(state.isMerged ? [] : [{ number: 34, headRefName: 'wa/12-login', url: 'u', reviews: state.reviews }])
      : argv.startsWith('gh api user')
        ? 'me\n'
        : ''
    return { value: { exitCode: stdout ? 0 : 1, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('tool.call', { tool: 'Bash' }, () => ({ result: { stdout: '{}', stderr: '' } }))
  on('command.run', ($, e) => {
    state.commands.push(`${e.command} ${e.args}`)
    return { text: '' }
  })
  on('prompt.suggest', ($, e) => {
    state.suggested.push(e.text)
    return { isShown: true }
  })
  on('store.get', ($, e) => ({ value: store[e.key] }))
  on('store.set', ($, e) => {
    store[e.key] = e.value
    return { value: undefined }
  })
  return state
}

test('run: a review on the claimed ticket\'s PR runs /wa-feedback here', { options: { review_feedback: 'run' } }, async ($, on) => {
  const clock = mock.clock(on)
  const state = world(on, 's1')
  state.reviews = [{ id: 'r1', author: { login: 'ana' }, state: 'COMMENTED', body: '' }]
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: CLAIM })
  await clock.settle()

  await clock.advance(60_000)
  expect(state.commands).toEqual([])

  state.reviews = [...state.reviews, { id: 'r2', author: { login: 'ana' }, state: 'CHANGES_REQUESTED', body: 'see inline' }]
  await clock.advance(60_000)
  expect(state.commands).toEqual(['whackagent:wa-feedback #12'])

  await clock.advance(60_000)
  expect(state.commands).toEqual(['whackagent:wa-feedback #12'])
})

test('the watched PRs are published per session for a status line, gone with the PR', { options: { review_feedback: 'run' } }, async ($, on) => {
  const clock = mock.clock(on)
  const store: Record<string, unknown> = { reviewWatching: { s0: { mode: 'suggest', prs: [{ id: '#9', pr: 20 }] } } }
  const state = world(on, 's1', store)
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: CLAIM })
  await clock.settle()
  expect(store.reviewWatching).toEqual({ s0: { mode: 'suggest', prs: [{ id: '#9', pr: 20 }] }, s1: { mode: 'run', prs: [{ id: '#12', pr: 34 }] } })

  state.isMerged = true
  await clock.advance(60_000)
  expect(store.reviewWatching).toEqual({ s0: { mode: 'suggest', prs: [{ id: '#9', pr: 20 }] } })
})

test('suggest: a review proposes /wa-feedback, runs nothing', async ($, on) => {
  const clock = mock.clock(on)
  const state = world(on, 's1')
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: CLAIM })
  await clock.settle()

  state.reviews = [{ id: 'r1', author: { login: 'ana' }, state: 'CHANGES_REQUESTED', body: '' }]
  await clock.advance(60_000)
  expect(state.commands).toEqual([])
  expect(state.suggested).toEqual(['/wa-feedback #12'])
})

test('no claim here, or a later claim in another session: nothing runs', { options: { review_feedback: 'run' } }, async ($, on) => {
  const clock = mock.clock(on)
  const store: Record<string, unknown> = {}
  const state = world(on, 's1', store)
  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  state.reviews = [{ id: 'r1', author: { login: 'ana' }, state: 'CHANGES_REQUESTED', body: '' }]
  await clock.advance(60_000)
  expect(state.commands).toEqual([])

  await $.tool.call({ tool: 'Bash', command: CLAIM })
  await clock.settle()
  store.reviewWatchOwners = { '/p #12': 's2' }
  state.reviews = [...state.reviews, { id: 'r2', author: { login: 'bob' }, state: 'COMMENTED', body: '' }]
  await clock.advance(60_000)
  expect(state.commands).toEqual([])
})
