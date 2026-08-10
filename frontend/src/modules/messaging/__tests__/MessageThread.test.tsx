// src/modules/messaging/__tests__/MessageThread.test.tsx
// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageThread } from '../components/MessageThread';

describe('MessageThread (SCRUM-42)', () => {
  it('renders initial page of messages with edited tag when applicable', () => {
    render(<MessageThread />);

    // بررسی دقیق پیام‌های صفحه اول با Exact Match
    expect(screen.getByText(/^Message content #20$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Message content #1$/i)).toBeInTheDocument();
    
    // بررسی تگ (edited) برای پیام‌های ویرایش‌شده
    const editedTags = screen.getAllByText('(edited)');
    expect(editedTags.length).toBeGreaterThan(0);
  });
});