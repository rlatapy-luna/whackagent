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
  /** frontmatter `type:` (feature | improvement | bug | refactor), '' when unset */
  type: string
  /** frontmatter `blocked_by:` slugs, [] when unset */
  blockedBy: string[]
}

export type GithubState = 'todo' | 'grilling' | 'grilled' | 'coding' | 'review' | 'done' | 'canceled'

/** Ticket id as `wa-backlog` gives it (`number`): GitHub issue number (12), or board key `<PROJECT>-<n>` ('WA-42'). */
export type TicketId = number | string

export type GithubTicket = {
  number: TicketId
  title: string
  summary: string
  size: string
  sprint: string
  milestone: string
  state: GithubState
  claimedBy: string
  reservedBy: string
  isMine: boolean
  /** task file `phase:` on the ticket branch, from `wa-backlog list` (`review` rows only), else '' */
  phase: string
  pr: { number: number; isDraft: boolean; url: string } | null
}

export type TaskFile = {
  phase: string
  /** frontmatter `type:`, '' when unset */
  type: string
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
  blockedBy: { number: TicketId; isOpen: boolean }[]
  prUrl: string
}

export type SprintParent = { number: TicketId; title: string; milestone: string }

export type MilestoneCount = { title: string; isOpen: boolean; tickets: number; done: number }

export type Board =
  | { kind: 'loading' }
  | { kind: 'no-config' }
  | { kind: 'error'; message: string }
  | { kind: 'local'; tasks: BoardTask[]; milestones: string[]; tracks: string[]; active: TaskFocus[]; here: string }
  | {
      /** every ticket board (`backlog.provider` github or plane): rows from `wa-backlog list` */
      kind: 'github'
      /** `backlog.provider`: github, plane */
      provider: string
      tickets: GithubTicket[]
      drafts: string[]
      milestones: MilestoneCount[]
      sprints: SprintParent[]
      tracks: string[]
      active: TaskFocus[]
      here: string
    }

declare module 'claude-code' {
  interface PluginState {
    whackagent: { board: Board; filter: string; task: string; isBoardHidden: boolean; expanded: string[]; openSprints: string[] }
  }
}
