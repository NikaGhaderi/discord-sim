import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('joins truthy class names with a space', () => {
    // eslint-disable-next-line no-constant-binary-expression
    expect(cn('a', 'b', false && 'c', undefined, 'd')).toBe('a b d');
  });

  it('lets a later Tailwind class win over an earlier conflicting one', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
