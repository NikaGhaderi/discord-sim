import React, { useState } from 'react';
import { Modal } from './Modal';
import { PALETTES } from '../theme/palettes';
import { applyPaletteByName, getStoredPaletteName } from '../theme/applyPalette';
import { Button } from './ui/Button';
import { cn } from '@shared/lib/cn';

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
    <Modal title="Theme" onClose={onClose} className="w-[min(40rem,calc(100%-2rem))]">
      <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
        {PALETTES.map((palette) => (
          <Button
            key={palette.name}
            variant="secondary"
            onClick={() => handleSelect(palette.name)}
            className={cn(
              'w-full justify-between gap-3 whitespace-nowrap text-left',
              selected === palette.name && 'border-brand'
            )}
          >
            <span className="overflow-hidden text-ellipsis">{palette.name}</span>
            <span className="flex shrink-0 gap-1">
              {palette.colors.map((color, index) => (
                <span
                  key={index}
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/15"
                  style={{ background: color }}
                />
              ))}
            </span>
          </Button>
        ))}
      </div>
    </Modal>
  );
};
