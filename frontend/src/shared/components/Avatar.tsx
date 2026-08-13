import React from 'react';
import { resolveMediaUrl } from '@infrastructure/apiClient';

interface AvatarProps {
  avatarUrl?: string | null;
  /** Used as alt text — should be the display name/username the avatar belongs to. */
  label: string;
  size?: number;
}

/**
 * Small round avatar image, shared across profile and private_spaces.
 * Falls back to a generated initial (not an external placeholder image --
 * that can silently fail to load, especially offline, leaving a blank gap)
 * when `avatarUrl` is null/empty.
 */
export const Avatar: React.FC<AvatarProps> = ({ avatarUrl, label, size = 28 }) => {
  if (avatarUrl) {
    return (
      <img
        src={resolveMediaUrl(avatarUrl)}
        alt={label}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          verticalAlign: 'middle',
          marginRight: '8px',
        }}
      />
    );
  }

  const initial = label.trim().charAt(0).toUpperCase() || '?';
  return (
    // inline-block + line-height centering, not inline-flex -- an
    // inline-flex box can participate in surrounding inline text flow
    // differently than a replaced element like <img>, and was observed
    // wrapping onto its own line next to sibling text where the <img>
    // variant didn't. This is the standard "letter avatar" pattern and
    // behaves identically to <img> in flow.
    <span
      role="img"
      aria-label={label}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        lineHeight: `${size}px`,
        textAlign: 'center',
        borderRadius: '50%',
        verticalAlign: 'middle',
        marginRight: '8px',
        background: 'var(--ws-primary)',
        color: 'var(--ws-text-on-bubble)',
        fontSize: Math.max(10, Math.round(size * 0.5)),
        fontWeight: 700,
      }}
    >
      {initial}
    </span>
  );
};
