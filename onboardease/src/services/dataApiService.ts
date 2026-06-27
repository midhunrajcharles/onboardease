/**
 * dataApiService.ts
 * Typed API client for all persistent data operations.
 * All data previously stored in localStorage is now sent to / fetched from
 * the SQLite-backed FastAPI backend at DATA_API_BASE.
 */

const DATA_API_BASE = import.meta.env.VITE_DATA_API_URL || 'http://localhost:3016'

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${DATA_API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new Error(`[dataApi] ${options?.method ?? 'GET'} ${path} → ${res.status}`)
  }
  // DELETE endpoints return { ok: true } — still valid JSON
  return res.json() as Promise<T>
}

// ── API surface ───────────────────────────────────────────────────────────────

export const dataApi = {

  /** Fetch the full app state for initial hydration (replaces localStorage.getItem). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getState: (): Promise<Record<string, any>> =>
    apiFetch('/api/state'),

  // ── Employees ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createEmployee: (emp: any) =>
    apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(emp) }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateEmployee: (id: string, updates: any) =>
    apiFetch(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  deleteEmployee: (id: string) =>
    apiFetch(`/api/employees/${id}`, { method: 'DELETE' }),

  // ── Tasks ──────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTask: (task: any) =>
    apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTasks: (tasks: any[]) =>
    apiFetch('/api/tasks/bulk', { method: 'POST', body: JSON.stringify(tasks) }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateTask: (id: string, updates: any) =>
    apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  deleteTask: (id: string) =>
    apiFetch(`/api/tasks/${id}`, { method: 'DELETE' }),

  // ── Documents ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createDocument: (doc: any) =>
    apiFetch('/api/documents', { method: 'POST', body: JSON.stringify(doc) }),

  deleteDocument: (id: string) =>
    apiFetch(`/api/documents/${id}`, { method: 'DELETE' }),

  // ── Mentors ────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMentor: (mentor: any) =>
    apiFetch('/api/mentors', { method: 'POST', body: JSON.stringify(mentor) }),

  deleteMentor: (id: string) =>
    apiFetch(`/api/mentors/${id}`, { method: 'DELETE' }),

  // ── Notifications ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createNotification: (notif: any) =>
    apiFetch('/api/notifications', { method: 'POST', body: JSON.stringify(notif) }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateNotification: (id: string, updates: any) =>
    apiFetch(`/api/notifications/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  // ── Conversations ──────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createConversation: (conv: any) =>
    apiFetch('/api/conversations', { method: 'POST', body: JSON.stringify(conv) }),

  deleteConversation: (id: string) =>
    apiFetch(`/api/conversations/${id}`, { method: 'DELETE' }),

  // ── Messages ───────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMessage: (msg: any) =>
    apiFetch('/api/messages', { method: 'POST', body: JSON.stringify(msg) }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMessage: (id: string, updates: any) =>
    apiFetch(`/api/messages/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  // ── Meetings ───────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMeeting: (meeting: any) =>
    apiFetch('/api/meetings', { method: 'POST', body: JSON.stringify(meeting) }),

  // ── Company settings ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSettings: (settings: any) =>
    apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) }),
}
