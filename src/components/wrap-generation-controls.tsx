import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { LockKeyhole, Plus, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

export type PromptPreset = { label: string; prompt: string };

export function WrapPromptInput({
  value,
  onChange,
  placeholder,
  ideasLabel,
  presets,
  maxLength = 2000,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ideasLabel: string;
  presets: PromptPreset[];
  maxLength?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        aria-label={placeholder}
        placeholder={placeholder}
        className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-ring h-40 w-full resize-y rounded-xl border px-3 pt-11 pb-3 text-sm leading-6 outline-none"
      />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 flex h-7 items-center gap-1.5 rounded-md px-2 text-xs">
          <Sparkles className="size-3.5" />
          {ideasLabel}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="end"
            sideOffset={8}
            className="z-50"
          >
            <Popover.Popup className="border-border bg-popover text-popover-foreground max-h-72 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border p-1.5 shadow-xl">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onChange(preset.prompt.slice(0, maxLength));
                    setOpen(false);
                  }}
                  className="hover:bg-muted focus-visible:bg-muted block w-full rounded-lg px-3 py-2 text-left text-sm"
                >
                  {preset.label}
                </button>
              ))}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

const SWATCHES = [
  '#ffffff',
  '#10151c',
  '#00d6a0',
  '#ff3b45',
  '#3268ff',
  '#ffd12a',
  '#8b5cf6',
  '#ff7a18',
];

export function WrapColorPreference({
  colors,
  onChange,
  label,
  customLabel,
}: {
  colors: string[];
  onChange: (colors: string[]) => void;
  label: string;
  customLabel: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <label
          title={customLabel}
          className="border-border relative flex size-6 cursor-pointer items-center justify-center rounded-full border bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]"
        >
          <Plus className="size-3.5 text-white drop-shadow" />
          <input
            type="color"
            aria-label={customLabel}
            value={colors.find((c) => !SWATCHES.includes(c)) ?? '#ffffff'}
            onChange={(e) =>
              onChange([
                ...new Set([
                  ...colors.filter((c) => SWATCHES.includes(c)),
                  e.target.value,
                ]),
              ])
            }
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        {[...new Set([...SWATCHES, ...colors])].map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${color}`}
            aria-pressed={colors.includes(color)}
            onClick={() =>
              onChange(
                colors.includes(color)
                  ? colors.filter((c) => c !== color)
                  : [...colors, color]
              )
            }
            className={cn(
              'border-border size-6 rounded-full border',
              colors.includes(color) &&
                'ring-primary ring-offset-card ring-2 ring-offset-2'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

export function WrapGalleryPreference({
  checked,
  isPaid,
  onChange,
  onUnlock,
  label,
  unlockLabel,
}: {
  checked: boolean;
  isPaid: boolean;
  onChange: (checked: boolean) => void;
  onUnlock: () => void;
  label: string;
  unlockLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          className="accent-primary"
          checked={isPaid ? checked : true}
          disabled={!isPaid}
          onChange={(e) => onChange(e.target.checked)}
        />
        {label}
      </label>
      {!isPaid && (
        <button
          type="button"
          onClick={onUnlock}
          title={unlockLabel}
          aria-label={unlockLabel}
          className="text-muted-foreground hover:text-primary rounded p-1"
        >
          <LockKeyhole className="size-3.5" />
        </button>
      )}
    </div>
  );
}
