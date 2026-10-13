import { Select } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Public select: 44px target, inset surface, emerald selection, keyboard navigation. */
export function StyledSelect({
  value,
  onValueChange,
  options,
  label,
  className,
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select.Root
      value={value}
      items={options}
      disabled={disabled}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next);
      }}
    >
      <Select.Trigger
        aria-label={label}
        className={cn(
          'border-border bg-popover/95 text-foreground hover:border-primary/50 focus-visible:ring-primary/60 data-popup-open:border-primary/60 flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-3.5 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <Select.Value className="min-w-0 truncate text-left" />
        <Select.Icon>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal
        container={
          typeof document === 'undefined'
            ? undefined
            : document.fullscreenElement instanceof HTMLElement
              ? document.fullscreenElement
              : undefined
        }
      >
        <Select.Positioner
          sideOffset={8}
          align="start"
          alignItemWithTrigger={false}
          className="z-50 max-w-[calc(100vw-2rem)]"
        >
          <Select.Popup className="border-border bg-popover text-popover-foreground max-h-[min(22rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-2xl border p-1.5 shadow-2xl outline-none">
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="data-highlighted:bg-primary/10 data-highlighted:text-primary data-selected:bg-primary/10 data-selected:text-primary relative flex min-h-11 cursor-pointer items-center rounded-lg py-2 pr-10 pl-3 text-sm outline-none select-none data-selected:font-semibold"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute right-3">
                    <Check className="size-4" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
