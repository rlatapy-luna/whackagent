import { expect, test } from 'claude-code/testing'

import {
  githubView,
  localView,
  taskActions,
  ticketActions,
  joinPath,
  toTickets,
  milestoneLines,
  nextAction,
  parseBacklog,
  parseConfig,
  parseFields,
  sprintLines,
  toTask,
} from './board'

const CONFIG = `---
discussion_language: en
paths:                         # comment
  backlog: docs/BACKLOG.md     # where
  tasks: docs/tasks
  wiki: .whackagent/wiki

backlog:
  provider: local              # local | github
  milestones: [0.2.0, "0.10.0"]

branch:
  tracks:                      # {server: develop_synchro} in a comment
    server: develop_synchro
---

# Project config
`

const BACKLOG = `# Backlog

## In progress

<!-- - [Ghost](tasks/ghost.md) -->

## Todo

<!-- multi-line
- [Ghost two](tasks/ghost-two.md)
-->
- [Login Apple](tasks/login-apple.md) · login-refacto — not grilled
- [Sync offline](tasks/sync-offline.md)

## Review

- [Export CSV](tasks/export-csv.md)
`

const task = (fields: Record<string, string>, status = 'todo') =>
  toTask({ title: 'Fallback', path: `tasks/${fields.slug ?? 'x'}.md`, status: undefined }, { status, ...fields })

test('config reads paths, provider, milestones and tracks', async () => {
  expect(parseConfig(CONFIG)).toEqual({
    backlog: 'docs/BACKLOG.md',
    tasks: 'docs/tasks',
    provider: 'local',
    milestones: ['0.2.0', '0.10.0'],
    tracks: ['server'],
    branchPrefix: 'wa/',
  })
})

test('missing config keys fall back to defaults', async () => {
  expect(parseConfig('---\nyagni: strict\n---\n').backlog).toBe('.whackagent/BACKLOG.md')
})

test('backlog skips commented lines and keeps section status', async () => {
  expect(parseBacklog(BACKLOG)).toEqual([
    { title: 'Login Apple', path: 'tasks/login-apple.md', status: 'todo' },
    { title: 'Sync offline', path: 'tasks/sync-offline.md', status: 'todo' },
    { title: 'Export CSV', path: 'tasks/export-csv.md', status: 'review' },
  ])
})

test('task frontmatter wins over backlog section, comments stripped', async () => {
  const fields = parseFields(`---
title: Fix #12 crash    # label
summary: Stop crash on launch
size: quickwin
status: in-progress
grilled: true
---
body`)
  const parsed = toTask({ title: 'Other', path: 'tasks/fix-crash.md', status: 'todo' }, fields)
  expect(parsed).toEqual({
    slug: 'fix-crash',
    title: 'Fix #12 crash',
    summary: 'Stop crash on launch',
    size: 'quickwin',
    sprint: '',
    milestone: '',
    status: 'in-progress',
    isGrilled: true,
  })
})

test('paths resolve relative to the backlog folder', async () => {
  expect(joinPath('/repo/docs', 'tasks/a.md')).toBe('/repo/docs/tasks/a.md')
  expect(joinPath('/repo/docs', '../other/./b.md')).toBe('/repo/other/b.md')
})

test('sprint and milestone lines count done over total, newest open marked', async () => {
  const tasks = [
    task({ slug: 'a', sprint: 's1', milestone: '0.10.0' }, 'done'),
    task({ slug: 'b', sprint: 's1', milestone: '0.10.0' }, 'review'),
    task({ slug: 'c', milestone: '0.2.0' }),
    task({ slug: 'd', milestone: 'server' }),
  ]
  expect(sprintLines(tasks)).toEqual(['🏁 s1 — 1/2 (1 in review)'])
  expect(milestoneLines(tasks, ['0.2.0', '0.10.0', 'server'], ['server'])).toEqual([
    '🎯 0.10.0 — 1/2 (1 in review) ← new tasks',
    '🎯 0.2.0 — 0/1 (1 todo)',
    '🎯 server — 0/1 (1 todo)',
  ])
})

test('next action follows wa-board precedence', async () => {
  const todo = task({ slug: 'todo' })
  expect(nextAction([todo])).toBe('/wa-grill todo')
  expect(nextAction([task({ slug: 'qw', size: 'quickwin' })])).toBe('/wa-code qw')
  expect(nextAction([todo, task({ slug: 'r' }, 'review')])).toBe('/wa-validate r')
  expect(nextAction([task({ slug: 'r' }, 'review'), task({ slug: 'v' }, 'validated')])).toBe('/wa-close v')
  expect(nextAction([])).toBe('/wa-task ')
})

const row = (fields: Record<string, unknown>) => ({
  number: 1,
  title: 'T',
  summary: 'S',
  state: 'todo',
  size: 'medium',
  sprint: null,
  milestone: null,
  closed: false,
  ignored: false,
  assignees: [],
  reserved: false,
  claims: [],
  ...fields,
})

test('github rows map claims, reservations, PRs, drafts; drop ignored and canceled', async () => {
  const { tickets, drafts } = toTickets(
    [
      row({ number: 12, state: 'coding', claims: [{ phase: 'coding', agent: 'mac:/src/app-worktrees/12-login', since: 'x' }] }),
      row({ number: 13, state: 'review' }),
      row({ number: 14, state: 'grilled', reserved: true, assignees: ['bob'] }),
      row({ number: 15, state: 'todo', ignored: true }),
      row({ number: 16, state: 'todo', closed: true }),
      { draft: true, title: 'Idea', item_id: 'x' },
    ],
    [{ number: 40, headRefName: 'wa/13-export', isDraft: true }],
    'wa/',
  )
  expect(drafts).toEqual(['Idea'])
  expect(tickets.map(ticket => [ticket.number, ticket.claimedBy, ticket.reservedBy, ticket.pr])).toEqual([
    [12, '12-login', '', null],
    [13, '', '', { number: 40, isDraft: true }],
    [14, '', 'bob', null],
  ])
})

test('github view orders by contract state and suggests the draft to test first', async () => {
  const { tickets, drafts } = toTickets(
    [
      row({ number: 2, state: 'todo', sprint: 'login', milestone: '0.5.0' }),
      row({ number: 3, state: 'review', milestone: '0.5.0' }),
      row({ number: 4, state: 'grilled' }),
      row({ number: 5, state: 'done', sprint: 'login', milestone: '0.5.0', closed: true }),
    ],
    [{ number: 9, headRefName: 'wa/3-x', isDraft: true }],
    'wa/',
  )
  const view = githubView(tickets, drafts, [{ title: '0.5.0', isOpen: true, tickets: 3, done: 1 }], [])
  expect(view.sections.map(section => section.title)).toEqual(['Todo', 'Grilled', 'Review', 'Done'])
  expect(view.sections[2]?.rows[0]?.tags.map(tag => tag.text)).toEqual(['#3', '🧪 draft #9'])
  expect(view.sections[0]?.rows[0]?.tags.map(tag => tag.text)).toEqual(['#2', 'login', '⚠'])
  expect(view.scopes).toEqual(['🏁 login — 1/2 (1 todo)', '🎯 0.5.0 — 1/3 (1 todo, 1 in review) ← new tasks'])
  expect(view.next).toEqual({ command: '/wa-validate 3' })
  expect(view.milestone).toBe('0.5.0')
})

test('milestone tab narrows tasks, scope line and next action', async () => {
  const tasks = [
    task({ slug: 'a', milestone: '0.3.0' }, 'review'),
    task({ slug: 'b', milestone: '0.2.0', sprint: 's1' }),
    task({ slug: 'c' }),
  ]
  const all = localView(tasks, ['0.2.0', '0.3.0'], [])
  expect(all.tabs).toEqual(['0.3.0', '0.2.0'])
  expect(all.filter).toBe('')
  const scoped = localView(tasks, ['0.2.0', '0.3.0'], [], '0.2.0')
  expect(scoped.sections.flatMap(section => section.rows.map(row => row.key))).toEqual(['b'])
  expect(scoped.scopes).toEqual(['🎯 0.2.0 — 0/1 (1 todo)'])
  expect(scoped.next).toEqual({ command: '/wa-grill b' })
  expect(localView(tasks, ['0.2.0', '0.3.0'], [], 'gone').filter).toBe('')
})

test('row actions follow the task state', async () => {
  const labels = (actions: { label: string }[]) => actions.map(one => one.label)
  expect(labels(taskActions(task({ slug: 'a' })))).toEqual(['grill'])
  expect(labels(taskActions(task({ slug: 'a', size: 'quickwin' })))).toEqual(['grill', 'code'])
  expect(labels(taskActions(task({ slug: 'a', grilled: 'true' })))).toEqual(['code'])
  expect(taskActions(task({ slug: 'a' }, 'review'))).toEqual([
    { label: 'feedback', command: '/wa-feedback a ' },
    { label: 'validate', command: '/wa-validate a' },
  ])
  expect(labels(taskActions(task({ slug: 'a' }, 'validated')))).toEqual(['close', 'feedback'])
  expect(taskActions(task({ slug: 'a' }, 'done'))).toEqual([])
  const [free, claimed, ready] = toTickets(
    [
      row({ number: 7, state: 'review' }),
      row({ number: 8, state: 'grilled', claims: [{ agent: 'x' }] }),
      row({ number: 9, state: 'review' }),
    ],
    [{ number: 30, headRefName: 'wa/9-x', isDraft: false }],
    'wa/',
  ).tickets
  expect(labels(ticketActions(free!))).toEqual(['feedback', 'validate'])
  expect(ticketActions(claimed!)).toEqual([])
  expect(ticketActions(ready!)).toEqual([])
})
