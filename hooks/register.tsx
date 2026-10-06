import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Board, BoardTask, MilestoneCount } from '../types'
import type { PullRequest, View } from './board'
import {
  SIZE_ICON,
  STATUS_ORDER,
  dirname,
  githubView,
  joinPath,
  localView,
  parseBacklog,
  parseConfig,
  parseFields,
  toTask,
  toTickets,
} from './board'
import type { WaConfig } from './board'

const PANE = 'wa-board'
const TITLE = 'Backlog'
const CONFIG = '.whackagent/config.md'
const TICK_MS = 2000
const GITHUB_POLL_MS = 30_000
const BOARD_COMMAND = /wa-backlog|\bgh\s+(pr|issue)\b/
const HOOKS_SETTLE_MS = 8000
const GITHUB_MARK = '<svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656"/></svg>'

const board = atom({ plugin: 'whackagent', key: 'board' } as const, { kind: 'loading' } as Board)
const filter = atom({ plugin: 'whackagent', key: 'filter' } as const, '')

let lastSignature = ''
let lastGithubFetch = 0
let isRefreshing = false

// region Local provider

const stamp = ($: EngineInterface, path: string) =>
  $.fs.stat(path).then(
    stat => `${path}@${stat.mtimeMs}`,
    () => `${path}@-`,
  )

async function localSignature($: EngineInterface, configText: string, backlogPath: string, tasksPath: string) {
  const tasks = await $.fs.list(tasksPath).catch(() => [])
  const files = tasks.map(file => `${file.name}@${file.mtimeMs}@${file.size}`).join(',')
  return `local\n${configText}\n${await stamp($, backlogPath)}\n${files}`
}

async function readTasks($: EngineInterface, backlogPath: string): Promise<BoardTask[]> {
  const entries = parseBacklog(await $.fs.read(backlogPath))
  const tasks = await Promise.all(
    entries.map(async entry => {
      const text = await $.fs.read(joinPath(dirname(backlogPath), entry.path)).catch(() => '')
      return toTask(entry, parseFields(text))
    }),
  )
  return STATUS_ORDER.flatMap(status => tasks.filter(task => task.status === status))
}

async function loadLocal($: EngineInterface, root: string, configText: string, config: WaConfig) {
  const backlogPath = joinPath(root, config.backlog)
  const signature = await localSignature($, configText, backlogPath, joinPath(root, config.tasks))
  if (signature === lastSignature) return undefined
  const next: Board = { kind: 'local', tasks: await readTasks($, backlogPath), milestones: config.milestones, tracks: config.tracks }
  return { next, signature }
}

// endregion

// region GitHub provider

async function runJson($: EngineInterface, argv: readonly string[], root: string, label: string): Promise<unknown> {
  const result = await $.process.run(argv, { cwd: root, timeoutMs: 60_000 })
  if (result.exitCode !== 0) {
    const reason = result.stderr.trim().split('\n').pop() || `exit ${result.exitCode}`
    throw new Error(`${label}: ${reason}`)
  }
  return JSON.parse(result.stdout)
}

async function loadGithub($: EngineInterface, root: string, config: WaConfig, isForced: boolean) {
  const now = await $.clock.now()
  if (!isForced && now - lastGithubFetch < GITHUB_POLL_MS) return undefined
  lastGithubFetch = now
  const script = `${$.plugin.root}/providers/github/wa-backlog`
  const [rows, milestones, pulls] = await Promise.all([
    runJson($, ['python3', script, 'list', '--all', '--owners'], root, 'wa-backlog list'),
    runJson($, ['python3', script, 'milestones'], root, 'wa-backlog milestones'),
    runJson($, ['gh', 'pr', 'list', '--json', 'number,headRefName,isDraft', '--limit', '200'], root, 'gh pr list').catch(
      () => [],
    ),
  ])
  const { tickets, drafts } = toTickets(rows as Record<string, unknown>[], pulls as PullRequest[], config.branchPrefix)
  const counts = (milestones as { title: string; open: boolean; tickets: number; done: number }[]).map(
    (milestone): MilestoneCount => ({ title: milestone.title, isOpen: milestone.open, tickets: milestone.tickets, done: milestone.done }),
  )
  const next: Board = { kind: 'github', tickets, drafts, milestones: counts, tracks: config.tracks }
  const signature = `github\n${JSON.stringify(next)}`
  return signature === lastSignature ? undefined : { next, signature }
}

// endregion

async function load($: EngineInterface, isForced: boolean): Promise<{ next: Board; signature: string } | undefined> {
  const root = await $.session.root()
  const configText = await $.fs.read(`${root}/${CONFIG}`).catch(() => undefined)
  if (configText === undefined) {
    return lastSignature === 'no-config' ? undefined : { next: { kind: 'no-config' }, signature: 'no-config' }
  }
  const config = parseConfig(configText)
  return config.provider === 'github'
    ? loadGithub($, root, config, isForced)
    : loadLocal($, root, configText, config)
}

async function refresh($: EngineInterface, isForced = false): Promise<Board> {
  if (isRefreshing) return read($, board)
  isRefreshing = true
  try {
    const loaded = await load($, isForced)
    if (!loaded) return await read($, board)
    lastSignature = loaded.signature
    await update($, board, () => loaded.next)
    return loaded.next
  } catch (error) {
    lastSignature = 'error'
    const failed: Board = { kind: 'error', message: error instanceof Error ? error.message : String(error) }
    await update($, board, () => failed)
    return failed
  } finally {
    isRefreshing = false
  }
}

function viewOf(current: Board, milestone: string): View | string {
  switch (current.kind) {
    case 'loading':
      return 'Reading backlog…'
    case 'no-config':
      return 'No .whackagent/config.md here — run /wa-setup.'
    case 'error':
      return `Backlog unreadable: ${current.message}`
    case 'local':
      return localView(current.tasks, current.milestones, current.tracks, milestone)
    case 'github':
      return githubView(current.tickets, current.drafts, current.milestones, current.tracks, milestone)
  }
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'wa-pane', description: 'Show the whackagent backlog in a live pane' })
    $.clock.every(TICK_MS, () => void refresh($))
    void refresh($).then(current => {
      if (options.auto_open !== false && current.kind !== 'no-config') void $.ui.open({ id: PANE, title: TITLE })
    })

    return next(e)
  })

  on('command.run', { command: 'wa-pane' }, async $ => {
    void refresh($, true)
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: 'Backlog pane opened.' }
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (BOARD_COMMAND.test(e.command)) $.clock.after(HOOKS_SETTLE_MS, () => void refresh($, true))

    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const current = await read($, board)
    const view = viewOf(current, await read($, filter))
    const reload = () => void refresh($, true)

    if (typeof view === 'string') {
      return (
        <Box flexDirection="column">
          <Text dimColor={current.kind !== 'error'} color={current.kind === 'error' ? 'error' : undefined}>
            {view}
          </Text>
          {current.kind === 'error' && <Button label="↻ retry" onPress={reload} />}
        </Box>
      )
    }

    const next = view.next
    const surface = e.surface
    const logo =
      current.kind === 'github' && surface !== 'terminal'
        ? (() => {
            const { Svg } = $.ui.resolve({ ...e, surface })
            return <Svg source={GITHUB_MARK} alt="GitHub" width={16} height={16} />
          })()
        : undefined
    let index = 0

    return (
      <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="row" alignItems="center" gap={1}>
          {logo ?? <Text dimColor>{`provider: ${current.kind}`}</Text>}
          {view.milestone !== '' && <Text dimColor>{`· milestone: ${view.milestone}`}</Text>}
        </Box>
        {view.tabs.length > 0 && (
          <Box flexDirection="row" flexWrap="wrap" gap={1} marginBottom={1}>
            {['', ...view.tabs].map(tab => (
              <Button
                key={`tab-${tab}`}
                label={`${tab === view.filter ? '● ' : ''}${tab || 'All'}`}
                variant={tab === view.filter ? 'primary' : 'secondary'}
                onPress={() => void update($, filter, () => tab)}
              />
            ))}
          </Box>
        )}
        {view.sections.length === 0 && <Text dimColor>Backlog empty.</Text>}
        {view.sections.map(section => (
          <Box key={section.title} flexDirection="column" marginBottom={1}>
            <Text bold>{section.title}</Text>
            {section.rows.map(row => {
              index += 1
              return (
                <Box key={row.key} flexDirection="column">
                  <Box flexDirection="row">
                    <Text dimColor={section.isClosed}>{`${index} · ${SIZE_ICON[row.size] ?? '·'} `}</Text>
                    <Text bold={!section.isClosed} dimColor={section.isClosed} wrap="truncate-end">
                      {row.title}
                    </Text>
                    {row.tags.map(tag => (
                      <Text
                        dimColor={tag.tone === 'muted'}
                        color={tag.tone === 'sprint' ? 'suggestion' : tag.tone === 'warning' ? 'warning' : undefined}
                      >
                        {tag.text === '⚠' ? ' ⚠' : ` · ${tag.text}`}
                      </Text>
                    ))}
                  </Box>
                  {(row.summary !== '' || row.actions.length > 0) && (
                    <Box paddingLeft={4} flexDirection="row" gap={1}>
                      <Box flexGrow={1} flexShrink={1}>
                        <Text dimColor wrap="truncate-end">
                          {row.summary}
                        </Text>
                      </Box>
                      {row.actions.map(one => (
                        <Button
                          key={`${row.key}-${one.label}`}
                          label={one.label}
                          onPress={() => void $.prompt.fill({ text: one.command })}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )
            })}
            {section.hidden > 0 && <Text dimColor>{`    +${section.hidden} more`}</Text>}
          </Box>
        ))}
        {view.legend !== '' && <Text dimColor>{view.legend}</Text>}
        {[...view.scopes, ...view.notes].map(line => (
          <Box key={line}>
            <Text dimColor>{line}</Text>
          </Box>
        ))}
        <Box marginTop={1} flexDirection="row" gap={1}>
          {'command' in next ? (
            <Button label={`next: ${next.command.trim()}`} variant="primary" onPress={() => void $.prompt.fill({ text: next.command })} />
          ) : (
            <Text color="suggestion">{`next: ${next.hint}`}</Text>
          )}
          {current.kind === 'github' && <Button label="↻" onPress={reload} />}
        </Box>
      </Box>
    )
  })
}
