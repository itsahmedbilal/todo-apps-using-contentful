import { isOverdue, todayIso } from './overdue';

describe('isOverdue', () => {
  const today = '2026-06-15';

  it('is overdue when active and the due date is earlier than today', () => {
    expect(isOverdue({ completed: false, dueDate: '2026-06-14' }, today)).toBe(true);
    expect(isOverdue({ completed: false, dueDate: '2025-01-01' }, today)).toBe(true);
  });

  it('is not overdue when due today or later', () => {
    expect(isOverdue({ completed: false, dueDate: '2026-06-15' }, today)).toBe(false);
    expect(isOverdue({ completed: false, dueDate: '2026-06-16' }, today)).toBe(false);
  });

  it('is never overdue when completed', () => {
    expect(isOverdue({ completed: true, dueDate: '2020-01-01' }, today)).toBe(false);
  });

  it('is not overdue without a due date', () => {
    expect(isOverdue({ completed: false }, today)).toBe(false);
    expect(isOverdue({ completed: false, dueDate: null }, today)).toBe(false);
    expect(isOverdue({ completed: false, dueDate: '' }, today)).toBe(false);
  });

  it('formats today in the local time zone', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
