import { expect, test } from 'claude-code/testing'

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
