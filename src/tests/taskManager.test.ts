import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager, BASSISTANT_TASK_CACHE_KEY } from '../voice/tasks/taskManager';

describe('TaskManager (Browser Cache Integration)', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    (globalThis as any).window = {
      sessionStorage: {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
      },
    };
  });

  it('generates task IDs with the bassistant_task_ prefix', () => {
    const manager = new TaskManager();
    const task = manager.createTask('diagram_and_explanation', 'Draw cloud architecture');

    expect(task.id).toMatch(/^bassistant_task_\d+_[a-z0-9]+$/);
    expect(task.status).toBe('queued');
    expect(task.prompt).toBe('Draw cloud architecture');
  });

  it('persists tasks to browser cache with bassistant_ prefix', () => {
    const manager = new TaskManager();
    const task = manager.createTask('diagram_and_explanation', 'Design event queue');

    expect(mockStorage[BASSISTANT_TASK_CACHE_KEY]).toBeDefined();
    const cached = JSON.parse(mockStorage[BASSISTANT_TASK_CACHE_KEY]);
    expect(cached[0].id).toBe(task.id);
    expect(cached[0].prompt).toBe('Design event queue');
  });

  it('updates task status through lifecycle: queued -> in_progress -> completed', () => {
    const manager = new TaskManager();
    const task = manager.createTask('diagram_and_explanation', 'Test pipeline');

    expect(task.status).toBe('queued');

    const inProgress = manager.updateTask(task.id, { status: 'in_progress' });
    expect(inProgress?.status).toBe('in_progress');

    const completed = manager.updateTask(task.id, {
      status: 'completed',
      shapesCount: 5,
      resultSummary: 'Rendered 5 shapes',
      completedAt: Date.now(),
    });

    expect(completed?.status).toBe('completed');
    expect(completed?.shapesCount).toBe(5);
    expect(completed?.resultSummary).toBe('Rendered 5 shapes');
    expect(completed?.completedAt).toBeDefined();

    // Verify retrieval by ID
    const retrieved = manager.getTask(task.id);
    expect(retrieved?.status).toBe('completed');
  });

  it('notifies subscribers on task creation and status changes', () => {
    const manager = new TaskManager();
    const emitted: number[] = [];

    const unsubscribe = manager.subscribe((tasks) => {
      emitted.push(tasks.length);
    });

    const task = manager.createTask('diagram_and_explanation', 'Subscribed flow');
    manager.updateTask(task.id, { status: 'in_progress' });
    manager.updateTask(task.id, { status: 'completed' });

    expect(emitted.length).toBe(3);
    unsubscribe();

    manager.createTask('diagram_and_explanation', 'After unsubscribe');
    expect(emitted.length).toBe(3);
  });

  it('retrieves the latest task and active tasks correctly', () => {
    const manager = new TaskManager();
    const task1 = manager.createTask('diagram_and_explanation', 'First task');
    manager.updateTask(task1.id, { status: 'completed' });

    const task2 = manager.createTask('diagram_and_explanation', 'Second task');
    manager.updateTask(task2.id, { status: 'in_progress' });

    expect(manager.getLatestTask()?.id).toBe(task2.id);
    expect(manager.getActiveTasks().length).toBe(1);
    expect(manager.getActiveTasks()[0].id).toBe(task2.id);
  });

  it('caps task cache history to maximum 20 records', () => {
    const manager = new TaskManager();
    for (let i = 0; i < 25; i++) {
      manager.createTask('diagram_and_explanation', `Task ${i}`);
    }

    expect(manager.getAllTasks().length).toBe(20);
    const cached = JSON.parse(mockStorage[BASSISTANT_TASK_CACHE_KEY]);
    expect(cached.length).toBe(20);
  });

  it('demotes persisted in_progress tasks to failed on reload', () => {
    // Simulate a page reload mid-draw: an in_progress task left in sessionStorage
    mockStorage[BASSISTANT_TASK_CACHE_KEY] = JSON.stringify([
      {
        id: 'bassistant_task_1_abcde',
        type: 'diagram_and_explanation',
        prompt: 'Interrupted diagram',
        status: 'in_progress',
        createdAt: Date.now() - 5000,
        updatedAt: Date.now() - 5000,
      },
    ]);

    const manager = new TaskManager();
    const reloaded = manager.getTask('bassistant_task_1_abcde');

    expect(reloaded?.status).toBe('failed');
    expect(reloaded?.error).toBe('Interrupted by page reload');
    expect(manager.getActiveTasks().length).toBe(0);

    // Demotion is persisted back to the cache
    const cached = JSON.parse(mockStorage[BASSISTANT_TASK_CACHE_KEY]);
    expect(cached[0].status).toBe('failed');
  });
});
