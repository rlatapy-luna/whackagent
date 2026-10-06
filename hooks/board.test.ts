import { expect, test } from 'claude-code/testing'

import {
  activeGithubIds,
  activeLocalIds,
  branchTaskId,
  parseWorktrees,
  bricksComment,
  githubFocusView,
  githubView,
  localFocusView,
  parseTaskFile,
  localView,
  taskActions,
  ticketActions,
  joinPath,
  toTickets,
  milestoneLines,
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

test('github view orders by contract state', async () => {
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
  expect(view.milestone).toBe('0.5.0')
})

test('milestone tab narrows tasks and scope line', async () => {
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

const TASK_FILE = `---
issue: 177
phase: validated
created: 2026-10-03
---

## Context / Decisions

<!-- comment -->
Menu on group rows.

## Acceptance criteria

1. A **long press** opens a menu.
2. Delete all entries asks for confirmation.
3. Labels read in English and French.

## Implementation

Three bricks, one implementer.

1. **Storage and sync.** \`AiEntry.unlinked\`
2. **Group menu.** \`DropdownMenu\`

## Review

### code — 2026-10-02
- Round 1: 2 findings.

### validation (autopilot) — 2026-10-03
- Round 1, 9 minor findings, all fixed.
- Round 2: clean.

## Verification

- ✅ AC1: long-click opens the menu.
- ❌ AC2: confirmation missing.
- ✅ AC3 (EN): labels on screen.
- Not run: iOS simulator.

## Feedback

### Round 1 — 2026-10-04
- Asked: secondary button style.
- Changed: LoginView.
`

test('branch maps to a task id per provider', async () => {
  expect(branchTaskId('wa/login-apple', 'wa/', 'local')).toBe('login-apple')
  expect(branchTaskId('wa/177-ai-group-menu', 'wa/', 'github')).toBe('#177')
  expect(branchTaskId('wa/notes', 'wa/', 'github')).toBe('')
  expect(branchTaskId('main', 'wa/', 'local')).toBe('')
  expect(branchTaskId('wa/', 'wa/', 'local')).toBe('')
})

test('task file sections parse into criteria, bricks, last review round, checks and feedback', async () => {
  expect(parseTaskFile(TASK_FILE)).toEqual({
    phase: 'validated',
    criteria: ['A long press opens a menu.', 'Delete all entries asks for confirmation.', 'Labels read in English and French.'],
    bricks: ['Storage and sync. `AiEntry.unlinked`', 'Group menu. `DropdownMenu`'],
    review: { heading: 'validation (autopilot) — 2026-10-03', lines: ['Round 1, 9 minor findings, all fixed.', 'Round 2: clean.'] },
    verification: ['✅ AC1: long-click opens the menu.', '❌ AC2: confirmation missing.', '✅ AC3 (EN): labels on screen.', 'Not run: iOS simulator.'],
    feedback: [{ heading: 'Round 1 — 2026-10-04', lines: ['Asked: secondary button style.', 'Changed: LoginView.'] }],
  })
  expect(bricksComment('🧱 2 bricks\n1. Auth provider — `AuthService`\n2. Button')).toEqual(['Auth provider — `AuthService`', 'Button'])
  expect(bricksComment('LGTM')).toEqual([])
})

test('github focus marks criteria from verification, lists sprint siblings and open blockers', async () => {
  const { tickets } = toTickets(
    [
      row({ number: 177, state: 'review', sprint: 'menus', milestone: '0.4.1' }),
      row({ number: 176, state: 'done', sprint: 'menus', title: 'Base menu' }),
    ],
    [{ number: 40, headRefName: 'wa/177-ai-group-menu', isDraft: true }],
    'wa/',
  )
  const view = githubFocusView(tickets, {
    id: '#177',
    worktree: '/src/app-worktrees/177-ai-group-menu',
    file: parseTaskFile(TASK_FILE),
    blockedBy: [
      { number: 10, isOpen: true },
      { number: 11, isOpen: false },
    ],
    prUrl: 'https://x/pull/40',
  })
  expect(view.facts).toEqual(['state: review · phase: validated · milestone 0.4.1', 'PR #40 draft — https://x/pull/40', '⛔ blocked by #10', '🌳 /src/app-worktrees/177-ai-group-menu'])
  expect(view.row?.actions.map(one => one.label)).toEqual(['close', 'feedback'])
  expect(view.blocks.map(block => block.title)).toEqual([
    '🏁 menus — 1/2',
    'Acceptance criteria (3)',
    'Bricks (2)',
    'Review — validation (autopilot) — 2026-10-03',
    'Verification ✅ 2 ❌ 1',
    'Feedback (1 round)',
  ])
  expect(view.blocks[0]?.lines.map(one => one.mark)).toEqual(['→', '✓'])
  expect(view.blocks[1]?.lines.map(one => one.mark)).toEqual(['✅', '❌', '✅'])
  expect(view.blocks[4]?.lines.map(one => one.text)).toEqual(['❌ AC2: confirmation missing.', 'Not run: iOS simulator.'])
})

test('local focus without a task file section still shows the task', async () => {
  const view = localFocusView([task({ slug: 'a', sprint: 's', grilled: 'true' }, 'in-progress')], {
    id: 'a',
    worktree: '',
    file: parseTaskFile('---\nstatus: in-progress\n---\n\n## Acceptance criteria\n\n## Feedback\n'),
    blockedBy: [],
    prUrl: '',
  }, 'a')
  expect(view.facts).toEqual(['status: in-progress · grilled', '📍 checked out here'])
  expect(view.blocks.map(block => block.title)).toEqual(['🏁 s — 0/1'])
  expect(localFocusView([], { id: 'gone', worktree: '', file: null, blockedBy: [], prUrl: '' }).facts).toEqual(['not in the backlog'])
})

test('worktree list parses into path and branch, detached heads skipped', async () => {
  const porcelain = [
    'worktree /src/app\nHEAD abc\nbranch refs/heads/main',
    'worktree /src/app-worktrees/12-login\nHEAD def\nbranch refs/heads/wa/12-login',
    'worktree /src/app-worktrees/tmp\nHEAD 123\ndetached',
  ].join('\n\n')
  expect(parseWorktrees(porcelain)).toEqual([
    { path: '/src/app', branch: 'main' },
    { path: '/src/app-worktrees/12-login', branch: 'wa/12-login' },
  ])
})

test('tasks in flight: grilling and coding only, checked-out task first', async () => {
  const tasks = [
    task({ slug: 'idea' }),
    task({ slug: 'tree' }),
    task({ slug: 'coding' }, 'in-progress'),
    task({ slug: 'testing' }, 'review'),
    task({ slug: 'shipped' }, 'done'),
  ]
  expect(activeLocalIds([...tasks, task({ slug: 'here' }, 'in-progress')], 'here')).toEqual(['here', 'coding'])
  expect(activeLocalIds(tasks, 'testing')).toEqual(['coding'])
  const { tickets } = toTickets(
    [
      row({ number: 1, state: 'coding', assignees: ['me'] }),
      row({ number: 2, state: 'coding', assignees: ['bob'], reserved: true }),
      row({ number: 3, state: 'todo', assignees: ['me'] }),
      row({ number: 4, state: 'grilling', assignees: ['me'] }),
      row({ number: 5, state: 'review', assignees: ['me'] }),
    ],
    [],
    'wa/',
  )
  expect(activeGithubIds(tickets, '#4')).toEqual(['#4', '#1'])
})

