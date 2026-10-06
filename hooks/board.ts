import type { BoardTask, GithubState, GithubTicket, MilestoneCount, TaskStatus } from '../types'

export type WaConfig = {
  backlog: string
  tasks: string
  provider: string
  milestones: string[]
  tracks: string[]
  branchPrefix: string
}

export type BacklogEntry = { title: string; path: string; status: TaskStatus | undefined }

export type Tone = 'sprint' | 'warning' | 'muted'
export type Action = { label: string; command: string }
export type ViewRow = {
  key: string
  size: string
  title: string
  tags: { text: string; tone: Tone }[]
  summary: string
  actions: Action[]
}
export type ViewSection = { title: string; rows: ViewRow[]; hidden: number; isClosed: boolean }
export type NextStep = { command: string } | { hint: string }
export type View = { sections: ViewSection[]; legend: string; scopes: string[]; notes: string[]; next: NextStep; milestone: string; tabs: string[]; filter: string }

type Scope = { name: string; line: string }

export type PullRequest = { number: number; headRefName: string; isDraft: boolean }

export const STATUS_ORDER: readonly TaskStatus[] = ['todo', 'in-progress', 'review', 'validated', 'done', 'canceled']
const GITHUB_ORDER: readonly GithubState[] = ['todo', 'grilling', 'grilled', 'coding', 'review', 'done']

const LOCAL_TITLE: Record<TaskStatus, string> = {
  'in-progress': 'In progress',
  todo: 'Todo',
  review: 'Review',
  validated: 'Validated',
  done: 'Done',
  canceled: 'Canceled',
}
const GITHUB_TITLE: Record<GithubState, string> = {
  coding: 'Coding',
  review: 'Review',
  grilled: 'Grilled',
  grilling: 'Grilling',
  todo: 'Todo',
  done: 'Done',
}
const LOCAL_LABEL: Partial<Record<string, string>> = {
  'in-progress': 'in progress',
  todo: 'todo',
  review: 'in review',
  validated: 'validated',
}
const GITHUB_LABEL: Partial<Record<string, string>> = {
  coding: 'coding',
  review: 'in review',
  grilled: 'grilled',
  grilling: 'grilling',
  todo: 'todo',
}

export const SIZE_ICON: Partial<Record<string, string>> = { quickwin: '🟢', medium: '🟡', large: '🔴' }
const SIZE_NAME: Record<string, string> = { quickwin: 'quick win', medium: 'medium', large: 'large' }
const CLOSED_SHOWN = 3
const NOT_GRILLED = '⚠'

const unquote = (value: string) => value.replace(/^["']|["']$/g, '')
const valueOf = (raw: string) => unquote(raw.replace(/\s+#(\s.*)?$/, '').trim())
const inlineList = (value: string) =>
  value.replace(/^\[|\]$/g, '').split(',').map(item => unquote(item.trim())).filter(Boolean)
const inlineMapKeys = (value: string) =>
  value
    .replace(/^\{|\}$/g, '')
    .split(',')
    .map(pair => unquote((pair.split(':')[0] ?? '').trim()))
    .filter(Boolean)

export const isLive = (task: BoardTask) => task.status !== 'done' && task.status !== 'canceled'

// region Parsing

function frontmatter(text: string): string[] {
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') return []
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  return lines.slice(1, end < 0 ? lines.length : end)
}

export function parseConfig(text: string): WaConfig {
  const config: WaConfig = {
    backlog: '.whackagent/BACKLOG.md',
    tasks: '.whackagent/tasks',
    provider: 'local',
    milestones: [],
    tracks: [],
    branchPrefix: 'wa/',
  }
  let block = ''
  let blockList: 'milestones' | 'tracks' | '' = ''
  for (const line of frontmatter(text)) {
    const top = line.match(/^([\w-]+):(.*)$/)
    if (top) {
      block = top[1] ?? ''
      blockList = ''
      continue
    }
    const nested = line.match(/^ {2}([\w-]+):(.*)$/)
    if (nested) {
      const [, key, rest = ''] = nested
      const value = valueOf(rest)
      blockList = ''
      if (block === 'paths' && key === 'backlog' && value) config.backlog = value
      else if (block === 'paths' && key === 'tasks' && value) config.tasks = value
      else if (block === 'backlog' && key === 'provider' && value) config.provider = value
      else if (block === 'branch' && key === 'prefix') config.branchPrefix = value
      else if (block === 'backlog' && key === 'milestones') {
        if (value) config.milestones = inlineList(value)
        else blockList = 'milestones'
      } else if (block === 'branch' && key === 'tracks') {
        if (value) config.tracks = inlineMapKeys(value)
        else blockList = 'tracks'
      }
      continue
    }
    const item = line.match(/^ {4}-\s*(.+)$/)
    if (item && blockList === 'milestones') config.milestones.push(valueOf(item[1] ?? ''))
    const entry = line.match(/^ {4}([^\s#-][^:]*):/)
    if (entry && blockList === 'tracks') config.tracks.push(unquote((entry[1] ?? '').trim()))
  }
  return config
}

export function parseFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const line of frontmatter(text)) {
    const field = line.match(/^([\w-]+):(.*)$/)
    if (field?.[1]) fields[field[1]] = valueOf(field[2] ?? '')
  }
  return fields
}

export function parseBacklog(text: string): BacklogEntry[] {
  const sectionStatus = Object.fromEntries(
    Object.entries(LOCAL_TITLE).map(([status, title]) => [title.toLowerCase(), status as TaskStatus]),
  )
  const entries: BacklogEntry[] = []
  let status: TaskStatus | undefined
  let isInComment = false
  for (const raw of text.split(/\r?\n/)) {
    let line = raw
    if (isInComment) {
      const end = line.indexOf('-->')
      if (end < 0) continue
      line = line.slice(end + 3)
      isInComment = false
    }
    line = line.replace(/<!--.*?-->/g, '')
    const open = line.indexOf('<!--')
    if (open >= 0) {
      line = line.slice(0, open)
      isInComment = true
    }
    const heading = line.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      status = sectionStatus[(heading[1] ?? '').toLowerCase()]
      continue
    }
    const link = line.match(/^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)/)
    if (link) entries.push({ title: link[1] ?? '', path: link[2] ?? '', status })
  }
  return entries
}

export const dirname = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')))

export function joinPath(dir: string, relative: string): string {
  if (relative.startsWith('/')) return relative
  const out: string[] = []
  for (const part of `${dir}/${relative}`.split('/')) {
    if (part === '..') out.pop()
    else if (part !== '.' && (part !== '' || out.length === 0)) out.push(part)
  }
  return out.join('/')
}

export function toTask(entry: BacklogEntry, fields: Record<string, string>): BoardTask {
  const declared = STATUS_ORDER.find(status => status === fields.status)
  return {
    slug: (entry.path.split('/').pop() ?? entry.path).replace(/\.md$/, ''),
    title: fields.title || entry.title,
    summary: fields.summary ?? '',
    size: fields.size ?? '',
    sprint: fields.sprint ?? '',
    milestone: fields.milestone ?? '',
    status: declared ?? entry.status ?? 'todo',
    isGrilled: fields.grilled === 'true',
  }
}

type RawRow = Record<string, unknown>
const text = (value: unknown) => (typeof value === 'string' ? value : '')

export function toTickets(
  rows: readonly RawRow[],
  pulls: readonly PullRequest[],
  branchPrefix: string,
): { tickets: GithubTicket[]; drafts: string[] } {
  const tickets: GithubTicket[] = []
  const drafts: string[] = []
  for (const row of rows) {
    if (row.draft === true) {
      drafts.push(text(row.title))
      continue
    }
    const state = GITHUB_ORDER.find(one => one === row.state)
    if (!state || row.ignored === true || (row.closed === true && state !== 'done')) continue
    const number = Number(row.number)
    const claims = Array.isArray(row.claims) ? (row.claims as RawRow[]) : []
    const assignees = Array.isArray(row.assignees) ? row.assignees.map(text) : []
    const pull = pulls.find(one => one.headRefName.startsWith(`${branchPrefix}${number}-`))
    tickets.push({
      number,
      title: text(row.title),
      summary: text(row.summary),
      size: text(row.size),
      sprint: text(row.sprint),
      milestone: text(row.milestone),
      state,
      claimedBy: claims.length > 0 ? (text(claims[0]?.agent).split(/[/\\]/).pop() ?? '') || '?' : '',
      reservedBy: row.reserved === true ? (assignees[0] ?? '?') : '',
      pr: pull ? { number: pull.number, isDraft: pull.isDraft } : null,
    })
  }
  return { tickets, drafts }
}

// endregion

// region Counting

function breakdown(states: readonly string[], order: readonly string[], labels: Partial<Record<string, string>>) {
  return order.flatMap(state => {
    const count = states.filter(one => one === state).length
    const label = labels[state]
    return count > 0 && label ? [`${count} ${label}`] : []
  })
}

const scopeLine = (icon: string, name: string, done: number, total: number, parts: readonly string[]) =>
  `${icon} ${name} — ${done}/${total}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`

export function compareVersions(a: string, b: string): number {
  const numbers = (value: string) => value.split(/[^0-9]+/).filter(Boolean).map(Number)
  const [left, right] = [numbers(a), numbers(b)]
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0)
    if (delta !== 0) return delta
  }
  return a.localeCompare(b)
}

export const newestMilestone = (milestones: readonly string[], tracks: readonly string[]) =>
  milestones.filter(name => !tracks.includes(name)).sort(compareVersions).pop() ?? ''

export const newestGithubMilestone = (milestones: readonly MilestoneCount[], tracks: readonly string[]) =>
  milestones.find(milestone => milestone.isOpen && !tracks.includes(milestone.title))?.title ?? ''

export function sprintLines(tasks: readonly BoardTask[]): string[] {
  const sprints = [...new Set(tasks.map(task => task.sprint).filter(Boolean))]
  return sprints.flatMap(sprint => {
    const members = tasks.filter(task => task.sprint === sprint)
    if (!members.some(isLive)) return []
    const done = members.filter(task => task.status === 'done').length
    return [scopeLine('🏁', sprint, done, members.length, breakdown(members.map(task => task.status), STATUS_ORDER, LOCAL_LABEL))]
  })
}

export const milestoneLines = (tasks: readonly BoardTask[], milestones: readonly string[], tracks: readonly string[]) =>
  milestoneScopes(tasks, milestones, tracks).map(scope => scope.line)

function milestoneScopes(tasks: readonly BoardTask[], milestones: readonly string[], tracks: readonly string[]): Scope[] {
  const newest = newestMilestone(milestones, tracks)
  const names = [...new Set([...milestones, ...tasks.map(task => task.milestone).filter(Boolean)])]
  return names
    .sort((a, b) => compareVersions(b, a))
    .flatMap(name => {
      const members = tasks.filter(task => task.milestone === name)
      if (!members.some(isLive)) return []
      const done = members.filter(task => task.status === 'done').length
      const parts = breakdown(members.map(task => task.status), STATUS_ORDER, LOCAL_LABEL)
      return [{ name, line: `${scopeLine('🎯', name, done, members.length, parts)}${name === newest ? ' ← new tasks' : ''}` }]
    })
}

export function githubSprintLines(tickets: readonly GithubTicket[]): string[] {
  const sprints = [...new Set(tickets.map(ticket => ticket.sprint).filter(Boolean))]
  return sprints.flatMap(sprint => {
    const members = tickets.filter(ticket => ticket.sprint === sprint)
    const done = members.filter(ticket => ticket.state === 'done').length
    if (done === members.length) return []
    return [scopeLine('🏁', sprint, done, members.length, breakdown(members.map(ticket => ticket.state), GITHUB_ORDER, GITHUB_LABEL))]
  })
}

function githubMilestoneScopes(
  tickets: readonly GithubTicket[],
  milestones: readonly MilestoneCount[],
  tracks: readonly string[],
): Scope[] {
  const newest = newestGithubMilestone(milestones, tracks)
  return milestones.flatMap(milestone => {
    if (milestone.tickets === milestone.done) return []
    const live = tickets.filter(ticket => ticket.milestone === milestone.title && ticket.state !== 'done')
    const parts = breakdown(live.map(ticket => ticket.state), GITHUB_ORDER, GITHUB_LABEL)
    const line = scopeLine('🎯', milestone.title, milestone.done, milestone.tickets, parts)
    return [{ name: milestone.title, line: `${line}${milestone.title === newest ? ' ← new tasks' : ''}` }]
  })
}

// endregion

// region Next action

export function nextAction(tasks: readonly BoardTask[]): string {
  const first = (status: TaskStatus) => tasks.find(task => task.status === status)
  const validated = first('validated')
  if (validated) return `/wa-close ${validated.slug}`
  const review = first('review')
  if (review) return `/wa-validate ${review.slug}`
  const coding = first('in-progress')
  if (coding) return `/wa-code ${coding.slug}`
  const todo = first('todo')
  if (!todo) return '/wa-task '
  return todo.isGrilled || todo.size === 'quickwin' ? `/wa-code ${todo.slug}` : `/wa-grill ${todo.slug}`
}

export function githubNextAction(tickets: readonly GithubTicket[]): NextStep {
  const isFree = (ticket: GithubTicket) => ticket.claimedBy === '' && ticket.reservedBy === ''
  const testing = tickets.find(ticket => ticket.state === 'review' && ticket.pr?.isDraft !== false && ticket.reservedBy === '')
  if (testing) return { command: `/wa-validate ${testing.number}` }
  const grilled = tickets.find(ticket => ticket.state === 'grilled' && isFree(ticket))
  if (grilled) return { command: `/wa-code ${grilled.number}` }
  const todo = tickets.find(ticket => ticket.state === 'todo' && isFree(ticket))
  if (todo) return { command: `/wa-grill ${todo.number}` }
  const ready = tickets.find(ticket => ticket.state === 'review' && ticket.pr && !ticket.pr.isDraft)
  if (ready?.pr) return { hint: `merge PR #${ready.pr.number} on GitHub` }
  return { command: '/wa-task ' }
}

const action = (label: string, command: string): Action => ({ label, command })

export function taskActions(task: BoardTask): Action[] {
  const { slug } = task
  switch (task.status) {
    case 'todo':
      return task.isGrilled
        ? [action('code', `/wa-code ${slug}`)]
        : [action('grill', `/wa-grill ${slug}`), ...(task.size === 'quickwin' ? [action('code', `/wa-code ${slug}`)] : [])]
    case 'in-progress':
      return [action('code', `/wa-code ${slug}`)]
    case 'review':
      return [action('feedback', `/wa-feedback ${slug} `), action('validate', `/wa-validate ${slug}`)]
    case 'validated':
      return [action('close', `/wa-close ${slug}`), action('feedback', `/wa-feedback ${slug} `)]
    default:
      return []
  }
}

export function ticketActions(ticket: GithubTicket): Action[] {
  const { number } = ticket
  if (ticket.reservedBy !== '' || ticket.claimedBy !== '') return []
  if (ticket.state === 'todo') return [action('grill', `/wa-grill ${number}`)]
  if (ticket.state === 'grilled') return [action('code', `/wa-code ${number}`)]
  if (ticket.state === 'review' && ticket.pr?.isDraft !== false) {
    return [action('feedback', `/wa-feedback ${number} `), action('validate', `/wa-validate ${number}`)]
  }
  return []
}

// endregion

// region View

function sections<T>(
  items: readonly T[],
  order: readonly string[],
  stateOf: (item: T) => string,
  titles: Record<string, string>,
  closedStates: readonly string[],
  toRow: (item: T) => ViewRow,
): ViewSection[] {
  return order.flatMap(state => {
    const members = items.filter(item => stateOf(item) === state)
    if (members.length === 0) return []
    const isClosed = closedStates.includes(state)
    const shown = isClosed ? members.slice(0, CLOSED_SHOWN) : members
    return [{ title: titles[state] ?? state, rows: shown.map(toRow), hidden: members.length - shown.length, isClosed }]
  })
}

function scoped<T extends { milestone: string }>(
  items: readonly T[],
  sprintScopes: readonly string[],
  milestoneScopes: readonly Scope[],
  filter: string,
) {
  const tabs = milestoneScopes.map(scope => scope.name)
  const active = tabs.includes(filter) ? filter : ''
  return {
    tabs,
    filter: active,
    shown: active ? items.filter(item => item.milestone === active) : items,
    scopes: active
      ? milestoneScopes.filter(scope => scope.name === active).map(scope => scope.line)
      : [...sprintScopes, ...milestoneScopes.map(scope => scope.line)],
  }
}

function legendOf(parts: readonly ViewSection[]): string {
  const rows = parts.flatMap(section => section.rows)
  const sizes = Object.keys(SIZE_NAME).filter(size => rows.some(row => row.size === size))
  const hasUngrilled = rows.some(row => row.tags.some(tag => tag.text === NOT_GRILLED))
  return [
    ...sizes.map(size => `${SIZE_ICON[size]} ${SIZE_NAME[size]}`),
    ...(hasUngrilled ? [`${NOT_GRILLED} not grilled`] : []),
  ].join(' · ')
}

export function localView(
  tasks: readonly BoardTask[],
  milestones: readonly string[],
  tracks: readonly string[],
  filter = '',
): View {
  const scope = scoped(tasks, sprintLines(tasks), milestoneScopes(tasks, milestones, tracks), filter)
  const parts = sections(scope.shown, STATUS_ORDER, task => task.status, LOCAL_TITLE, ['done', 'canceled'], task => ({
    key: task.slug,
    size: task.size,
    title: task.title,
    tags: [
      ...(task.sprint ? [{ text: task.sprint, tone: 'sprint' as const }] : []),
      ...(!task.isGrilled && isLive(task) ? [{ text: NOT_GRILLED, tone: 'warning' as const }] : []),
    ],
    summary: task.summary,
    actions: taskActions(task),
  }))
  return {
    sections: parts,
    legend: legendOf(parts),
    scopes: scope.scopes,
    notes: [],
    next: { command: nextAction(scope.shown) },
    milestone: newestMilestone(milestones, tracks),
    tabs: scope.tabs,
    filter: scope.filter,
  }
}

export function githubView(
  tickets: readonly GithubTicket[],
  drafts: readonly string[],
  milestones: readonly MilestoneCount[],
  tracks: readonly string[],
  filter = '',
): View {
  const scope = scoped(tickets, githubSprintLines(tickets), githubMilestoneScopes(tickets, milestones, tracks), filter)
  const parts = sections(scope.shown, GITHUB_ORDER, ticket => ticket.state, GITHUB_TITLE, ['done'], ticket => ({
    key: String(ticket.number),
    size: ticket.size,
    title: ticket.title,
    tags: [
      { text: `#${ticket.number}`, tone: 'muted' as const },
      ...(ticket.sprint ? [{ text: ticket.sprint, tone: 'sprint' as const }] : []),
      ...(ticket.claimedBy ? [{ text: `🔒 ${ticket.claimedBy}`, tone: 'muted' as const }] : []),
      ...(ticket.reservedBy ? [{ text: `👤 @${ticket.reservedBy}`, tone: 'muted' as const }] : []),
      ...(ticket.state === 'review' && ticket.pr
        ? [{ text: ticket.pr.isDraft ? `🧪 draft #${ticket.pr.number}` : `🔀 ready #${ticket.pr.number}`, tone: 'muted' as const }]
        : []),
      ...(ticket.state === 'todo' ? [{ text: NOT_GRILLED, tone: 'warning' as const }] : []),
    ],
    summary: ticket.summary,
    actions: ticketActions(ticket),
  }))
  return {
    sections: parts,
    legend: legendOf(parts),
    scopes: scope.scopes,
    notes: !scope.filter && drafts.length > 0 ? [`📝 ${drafts.length} draft${drafts.length > 1 ? 's' : ''} — convert to issue on GitHub`] : [],
    next: githubNextAction(scope.shown),
    milestone: newestGithubMilestone(milestones, tracks),
    tabs: scope.tabs,
    filter: scope.filter,
  }
}

// endregion
