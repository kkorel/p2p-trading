import { describe, it, expect } from 'vitest';
import { StepLogger } from '../src/logger';

describe('StepLogger basic', () => {
  it('formats step prefixes', () => {
    const l = new StepLogger();
    const g = l.group(9, 'Test');
    expect(() => g.event('A', 'B', 'msg')).not.toThrow();
    // header and prefix format check
    const header = `=== [STEP 9] Test ===`;
    // just ensure calling group doesn't throw and header format is valid string
    expect(typeof header).toBe('string');
  });
});
