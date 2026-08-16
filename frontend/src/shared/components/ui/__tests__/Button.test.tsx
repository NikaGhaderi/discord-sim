import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children and responds to click', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the danger variant class', () => {
    render(<Button variant="danger">Delete</Button>);

    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('bg-danger');
  });

  it('defaults type to "button" so it never accidentally submits a form', () => {
    render(<Button>Click</Button>);

    expect(screen.getByRole('button', { name: 'Click' })).toHaveAttribute('type', 'button');
  });
});
