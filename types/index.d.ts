export type TaskStatus = 'in-progress' | 'todo' | 'review' | 'validated' | 'done' | 'canceled'

export type BoardTask = {
  slug: string
  title: string
  summary: string
  size: string
  sprint: string
  milestone: string
  status: TaskStatus
  isGrilled: boolean
}

export type GithubState = 'todo' | 'grilling' | 'grilled' | 'coding' | 'review' | 'done'

export type GithubTicket = {
  number: number
  title: string
  summary: string
  size: string
  sprint: string
  milestone: string
  state: GithubState
  claimedBy: string
  reservedBy: string
  isMine: boolean
  pr: { number: number; isDraft: boolean } | null
}

export type TaskFile = {
  phase: string
  criteria: string[]
  bricks: string[]
  review: { heading: string; lines: string[] }
  verification: string[]
  feedback: { heading: string; lines: string[] }[]
}

export type TaskFocus = {
  id: string
  worktree: string
  file: TaskFile | null
  blockedBy: { number: number; isOpen: boolean }[]
  prUrl: string
}

export type MilestoneCount = { title: string; isOpen: boolean; tickets: number; done: number }

export type Board =
  | { kind: 'loading' }
  | { kind: 'no-config' }
  | { kind: 'error'; message: string }
  | { kind: 'local'; tasks: BoardTask[]; milestones: string[]; tracks: string[]; active: TaskFocus[]; here: string }
  | {
      kind: 'github'
      tickets: GithubTicket[]
      drafts: string[]
      milestones: MilestoneCount[]
      tracks: string[]
      active: TaskFocus[]
      here: string
    }

declare module 'claude-code' {
  interface PluginState {
    whackagent: { board: Board; filter: string; task: string }
  }
}
