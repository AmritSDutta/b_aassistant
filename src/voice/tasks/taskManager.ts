export type TaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed';
export type TaskType = 'diagram_and_explanation' | 'document_index' | 'pdf_export';

export interface BackgroundTaskRecord {
  id: string;
  type: TaskType;
  prompt: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  shapesCount?: number;
  resultSummary?: string;
  error?: string;
}

export type TaskListener = (tasks: BackgroundTaskRecord[]) => void;

export const BASSISTANT_TASK_CACHE_KEY = 'bassistant_background_tasks';
const MAX_CACHED_TASKS = 20;

export class TaskManager {
  private cacheKey: string;
  private tasks: BackgroundTaskRecord[] = [];
  private listeners: Set<TaskListener> = new Set();

  constructor(cacheKey: string = BASSISTANT_TASK_CACHE_KEY) {
    this.cacheKey = cacheKey;
    this.loadFromCache();
  }

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
    return null;
  }

  private loadFromCache(): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      const raw = storage.getItem(this.cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.tasks = parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load tasks from browser cache:', err);
      this.tasks = [];
      return;
    }

    // Tasks persisted as queued/in_progress can never finish after a page
    // reload — demote them so the badge and status tool never report false activity.
    const isStale = (t: BackgroundTaskRecord) => t.status === 'queued' || t.status === 'in_progress';
    if (this.tasks.some(isStale)) {
      const now = Date.now();
      this.tasks = this.tasks.map((t) =>
        isStale(t)
          ? { ...t, status: 'failed', error: 'Interrupted by page reload', completedAt: now, updatedAt: now }
          : t
      );
      this.saveToCache();
    }
  }

  private saveToCache(): void {
    const storage = this.getStorage();
    if (!storage) return;

    try {
      storage.setItem(this.cacheKey, JSON.stringify(this.tasks.slice(0, MAX_CACHED_TASKS)));
    } catch (err) {
      console.warn('Failed to persist tasks to browser cache:', err);
    }
  }

  private notify(): void {
    const snapshot = [...this.tasks];
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error in TaskManager listener:', err);
      }
    }
  }

  createTask(type: TaskType, prompt: string): BackgroundTaskRecord {
    const now = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const id = `bassistant_task_${now}_${randomSuffix}`;

    const record: BackgroundTaskRecord = {
      id,
      type,
      prompt,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks = [record, ...this.tasks].slice(0, MAX_CACHED_TASKS);
    this.saveToCache();
    this.notify();
    return record;
  }

  updateTask(id: string, patch: Partial<Omit<BackgroundTaskRecord, 'id' | 'createdAt'>>): BackgroundTaskRecord | null {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const existing = this.tasks[index];
    const updated: BackgroundTaskRecord = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };

    this.tasks[index] = updated;
    this.saveToCache();
    this.notify();
    return updated;
  }

  getTask(id: string): BackgroundTaskRecord | null {
    return this.tasks.find((t) => t.id === id) || null;
  }

  getLatestTask(type?: TaskType): BackgroundTaskRecord | null {
    if (!type) {
      return this.tasks[0] || null;
    }
    return this.tasks.find((t) => t.type === type) || null;
  }

  getActiveTasks(): BackgroundTaskRecord[] {
    return this.tasks.filter((t) => t.status === 'in_progress' || t.status === 'queued');
  }

  getAllTasks(): BackgroundTaskRecord[] {
    return [...this.tasks];
  }

  clearTasks(): void {
    this.tasks = [];
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem(this.cacheKey);
      } catch {
        // Ignore cache clear error
      }
    }
    this.notify();
  }

  subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const globalTaskManager = new TaskManager();
