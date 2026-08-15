import React, { useState } from 'react';
import { Modal } from './Modal';
import { PALETTES } from '../theme/palettes';
import { applyPaletteByName, getStoredPaletteName } from '../theme/applyPalette';

interface ThemePickerProps {
  onClose: () => void;
}

/**
 * Global theme picker -- lists every supported color palette by name with
 * small circle previews of its actual swatches (so a user can tell what a
 * palette looks like without having to select it first), and applies the
 * chosen one immediately across the whole app.
 */
export const ThemePicker: React.FC<ThemePickerProps> = ({ onClose }) => {
  const [selected, setSelected] = useState(getStoredPaletteName());

  const handleSelect = (name: string) => {
    applyPaletteByName(name);
    setSelected(name);
  };

  return (
    <Modal title="Theme" onClose={onClose} className="modal-card--wide">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '60vh', overflowY: 'auto' }}>
        {PALETTES.map((palette) => (
          <button
            key={palette.name}
            type="button"
            onClick={() => handleSelect(palette.name)}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              justifyContent: 'space-between',
              whiteSpace: 'nowrap',
              borderColor: selected === palette.name ? 'var(--ws-primary)' : undefined,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{palette.name}</span>
            <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
              {palette.colors.map((color, index) => (
                <span
                  key={index}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: color,
                    border: '1px solid rgba(0,0,0,0.15)',
                    flexShrink: 0,
                  }}
                />
              ))}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
};
