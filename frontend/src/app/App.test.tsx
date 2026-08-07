import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App Component', () => {
  test('renders login form by default on root path', () => {
    render(<App />);
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
  });

  test('renders profile page when navigated to /profile', () => {
    window.history.pushState({}, 'Profile Page', '/profile');
    render(<App />);
    
    expect(screen.getByText(/Fatemeh Roosta/i)).toBeInTheDocument();
  });
});