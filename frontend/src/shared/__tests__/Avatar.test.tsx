import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Avatar } from '../components/Avatar';

describe('Avatar', () => {
  it('renders the given avatar_url as the image src', () => {
    render(<Avatar avatarUrl="https://storage/avatars/nika.jpg" label="nika_gh" />);

    const img = screen.getByRole('img', { name: 'nika_gh' });
    expect(img).toHaveAttribute('src', 'https://storage/avatars/nika.jpg');
  });

  it('falls back to the shared placeholder when avatarUrl is null', () => {
    render(<Avatar avatarUrl={null} label="no_avatar" />);

    expect(screen.getByRole('img', { name: 'no_avatar' })).toHaveAttribute(
      'src',
      'https://via.placeholder.com/150'
    );
  });

  it('falls back to the shared placeholder when avatarUrl is an empty string', () => {
    render(<Avatar avatarUrl="" label="empty_avatar" />);

    expect(screen.getByRole('img', { name: 'empty_avatar' })).toHaveAttribute(
      'src',
      'https://via.placeholder.com/150'
    );
  });

  it('defaults to a 28px size, overridable via the size prop', () => {
    render(<Avatar avatarUrl={null} label="sized" size={40} />);

    const img = screen.getByRole('img', { name: 'sized' });
    expect(img).toHaveStyle({ width: '40px', height: '40px' });
  });
});
