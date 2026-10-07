import { expect, mock, test } from 'claude-code/testing'

const FILES: Record<string, string> = {
  '/p/.whackagent/config.md': '---\nbacklog:\n  provider: local\n---\n',
  '/p/.whackagent/BACKLOG.md': '# Backlog\n\n## Todo\n\n- [Login Apple](tasks/login-apple.md)\n',
  '/p/.whackagent/tasks/login-apple.md':
    '---\ntitle: Login Apple\nsummary: Sign in with Apple\nsize: medium\nstatus: todo\ngrilled: false\n---\n',
}

const PANE = {
  plugin: 'whackagent',
  component: 'Pane',
  requestId: 'wa-board',
  props: {
    title: 'Backlog',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

test('board toggle is drawn first and folds the board', async ($, on) => {
  on('session.root', () => ({ value: '/p' }))
  on('session.start', () => ({ cwd: '/p' }))
  on('command.register', () => ({ value: { command: 'wa-pane' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', ($, e) => {
    const text = FILES[e.path]
    return text === undefined ? { deny: `ENOENT ${e.path}` } : { value: text }
  })
  on('fs.list', () => ({ value: [] }))
  on('fs.stat', () => ({ deny: 'ENOENT' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ key: 'board-toggle' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Login Apple/ })).toBeDefined()
    await ui.press({ key: 'board-toggle' })
    expect(await ui.find({ type: 'Text', text: /1 open task/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Login Apple/ })).toBeUndefined()
    await ui.press({ key: 'board-toggle' })
    await ui.unmount()
  }
})

const GITHUB_CONFIG = '---\nbacklog:\n  provider: github\n---\n'
const ROWS = [
  { number: 12, title: 'Login', summary: 'S', state: 'coding', size: 'medium', sprint: 'auth', assignees: ['me'], reserved: false, claims: [] },
  { number: 13, title: 'Export', summary: 'S', state: 'review', size: 'medium', assignees: [], reserved: false, claims: [] },
]
const PULLS = [
  { number: 40, headRefName: 'wa/13-export', isDraft: true, url: 'https://github.com/o/r/pull/40' },
  { number: 41, headRefName: 'wa/12-login', isDraft: true, url: 'https://github.com/o/r/pull/41' },
]

test('a PR opens from its tag and its in-flight tab: link on desktop, gh button on terminal', async ($, on) => {
  const ok = (stdout: string) => ({ value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
  on('session.root', () => ({ value: '/p' }))
  on('session.start', () => ({ cwd: '/p' }))
  on('command.register', () => ({ value: { command: 'wa-pane' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('clock.now', () => ({ value: 1_800_000_000_000 }))
  on('fs.read', ($, e) => (e.path === '/p/.whackagent/config.md' ? { value: GITHUB_CONFIG } : { deny: `ENOENT ${e.path}` }))
  on('fs.stat', () => ({ deny: 'ENOENT' }))
  const opened: string[] = []
  on('process.run', ($, e) => {
    const command = e.argv.join(' ')
    if (command.startsWith('gh pr view')) opened.push(command)
    if (command.includes('wa-backlog list')) return ok(JSON.stringify(ROWS))
    if (command.includes('wa-backlog milestones')) return ok('[]')
    if (command.startsWith('gh pr list')) return ok(JSON.stringify(PULLS))
    if (command.startsWith('gh issue list')) return ok(JSON.stringify([{ number: 90, title: 'Auth', milestone: null }]))
    if (command.includes('rev-parse --abbrev-ref')) return ok('main')
    return ok(command.startsWith('git') ? '' : '{}')
  })

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const toggle = async () => (await ui.find({ key: 'toggle-sprint-auth' }))?.props.label
    expect(await toggle()).toBe('▸ 1 ticket')
    await ui.press({ key: 'toggle-sprint-auth' })
    expect(await toggle()).toBe('▾ hide tickets')
    await ui.press({ key: 'toggle-sprint-auth' })
    if (surface === 'desktop') {
      const links = await Promise.all([ui.find({ type: 'Link', text: /draft #40/ }), ui.find({ type: 'Link', text: /PR #41/ })])
      expect(links.map(link => link?.props.href)).toEqual(['https://github.com/o/r/pull/40', 'https://github.com/o/r/pull/41'])
    } else {
      const found = await Promise.all([ui.find({ key: 'pr-13' }), ui.find({ key: 'open-pr' })])
      expect(found.map(one => one?.type)).toEqual(['Button', 'Button'])
      await ui.press({ key: 'pr-13' })
      expect(opened).toEqual(['gh pr view https://github.com/o/r/pull/40 --web'])
    }
    await ui.unmount()
  }
})

test('+N more under Done shows every task, show less folds it back', async ($, on) => {
  const slugs = ['t1', 't2', 't3', 't4', 't5']
  const files: Record<string, string> = {
    '/p/.whackagent/config.md': '---\nbacklog:\n  provider: local\n---\n',
    '/p/.whackagent/BACKLOG.md': `# Backlog\n\n## Done\n\n${slugs.map(slug => `- [${slug}](tasks/${slug}.md)`).join('\n')}\n`,
    ...Object.fromEntries(slugs.map(slug => [`/p/.whackagent/tasks/${slug}.md`, `---\ntitle: Task ${slug}\nstatus: done\n---\n`])),
  }
  on('session.root', () => ({ value: '/p' }))
  on('session.start', () => ({ cwd: '/p' }))
  on('command.register', () => ({ value: { command: 'wa-pane' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('fs.read', ($, e) => {
    const text = files[e.path]
    return text === undefined ? { deny: `ENOENT ${e.path}` } : { value: text }
  })
  on('fs.list', () => ({ value: [] }))
  on('fs.stat', () => ({ deny: 'ENOENT' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Task t1/ })).toBeUndefined()
  await ui.press({ key: 'more-done' })
  expect(await ui.find({ type: 'Text', text: /Task t1/ })).toBeDefined()
  expect((await ui.find({ key: 'more-done' }))?.props.label).toBe('show less')
  await ui.press({ key: 'more-done' })
  expect(await ui.find({ type: 'Text', text: /Task t1/ })).toBeUndefined()
  await ui.unmount()
})

test('the next command an answer ends on becomes the prompt suggestion, over the engine guess', async ($, on) => {
  const clock = mock.clock(on)
  const shown: string[] = []
  on('session.root', () => ({ value: '/p' }))
  on('command.register', () => ({ value: { command: 'wa-pane' } }))
  on('fs.read', ($, e) => (e.path === '/p/.whackagent/config.md' ? { value: FILES[e.path]! } : { deny: 'ENOENT' }))
  on('fs.list', () => ({ value: [] }))
  on('fs.stat', () => ({ deny: 'ENOENT' }))
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('session.start', () => ({ cwd: '/p' }))
  on('turn.start', () => ({ turnId: 't2' }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('prompt.suggest', ($, e) => {
    shown.push(e.text)
    return { isShown: true }
  })

  await $.session.start({ cwd: '/p', surface: 'terminal', isInteractive: true })
  const answer = '🟡 #216 Login\n\n→ next: test it, then `/wa-validate 216` (or `/wa-feedback 216 <notes>`)'
  await $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })
  await clock.advance(1000)
  expect(shown).toEqual(['/wa-validate 216'])
  await $.prompt.suggest({ text: 'run the tests', origin: { kind: 'suggestion' } })
  expect(shown).toEqual(['/wa-validate 216', '/wa-validate 216'])
  await $.turn.start({ text: 'go', turnId: 't2' })
  await $.prompt.suggest({ text: 'run the tests', origin: { kind: 'suggestion' } })
  expect(shown.at(-1)).toBe('run the tests')
})
