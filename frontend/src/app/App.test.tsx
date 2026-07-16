import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App Component', () => {
  test('renders login form by default', () => {
    render(<App />);
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
  });
});