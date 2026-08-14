import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Avatar } from '../components/Avatar';

describe('Avatar', () => {
  it('renders the given avatar_url as the image src', () => {
    render(<Avatar avatarUrl="https://storage/avatars/nika.jpg" label="nika_gh" />);

    const img = screen.getByRole('img', { name: 'nika_gh' });
    expect(img).toHaveAttribute('src', 'https://storage/avatars/nika.jpg');
  });

  it('falls back to a generated initial when avatarUrl is null', () => {
    render(<Avatar avatarUrl={null} label="no_avatar" />);

    const fallback = screen.getByRole('img', { name: 'no_avatar' });
    expect(fallback.tagName).toBe('SPAN');
    expect(fallback).toHaveTextContent('N');
  });

  it('falls back to a generated initial when avatarUrl is an empty string', () => {
    render(<Avatar avatarUrl="" label="empty_avatar" />);

    const fallback = screen.getByRole('img', { name: 'empty_avatar' });
    expect(fallback.tagName).toBe('SPAN');
    expect(fallback).toHaveTextContent('E');
  });

  it('defaults to a 28px size, overridable via the size prop', () => {
    render(<Avatar avatarUrl={null} label="sized" size={40} />);

    const img = screen.getByRole('img', { name: 'sized' });
    expect(img).toHaveStyle({ width: '40px', height: '40px' });
  });
});
