/**
 * MobileSelect – drops in as a replacement for shadcn Select.
 * On mobile (≤768px) it renders a native bottom-sheet Drawer.
 * On desktop it renders the original shadcn Select unchanged.
 *
 * Usage (identical API to shadcn Select):
 *   <MobileSelect value={val} onValueChange={setVal} placeholder="Choose…">
 *     <MobileSelectItem value="a">Option A</MobileSelectItem>
 *     <MobileSelectItem value="b">Option B</MobileSelectItem>
 *   </MobileSelect>
 */
import { useState, Children, isValidElement } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ChevronDown, Check } from 'lucide-react';

function useIsMobile() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || ('ontouchstart' in window);
}

// Re-export so consumers can use <MobileSelectItem> for both paths
export function MobileSelectItem({ value, children }) {
  // This is only used as a data carrier; rendering is done by MobileSelect
  return null;
}
MobileSelectItem.displayName = 'MobileSelectItem';

export default function MobileSelect({
  value,
  onValueChange,
  placeholder = 'Seleccionar…',
  disabled = false,
  children,
  className = '',
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  // Extract items from children
  const items = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && (child.type === MobileSelectItem || child.props?.value !== undefined)) {
      items.push({ value: child.props.value, label: child.props.children });
    }
  });

  const selectedLabel = items.find((i) => i.value === value)?.label ?? placeholder;

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          className={`flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        >
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedLabel}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>

        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{placeholder}</DrawerTitle>
            </DrawerHeader>
            <div className="pb-safe flex flex-col gap-0 px-4 pb-6 overflow-y-auto max-h-[60vh]">
              {items.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="flex min-h-[48px] w-full items-center justify-between rounded-lg px-3 py-3 text-sm hover:bg-accent active:bg-accent/70 transition-colors"
                  onClick={() => {
                    onValueChange?.(item.value);
                    setOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  {value === item.value && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: standard shadcn Select
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}