"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer as VaulDrawer } from "vaul"
import { cn } from "@/lib/utils"

// ── Mobile detection (SSR-safe) ──────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = React.useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setMobile(mq.matches);
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

// ── Context to share open state between Select and SelectContent ──────────────
const MobileSelectCtx = React.createContext(null);

// ── Select root: wraps Radix root + mobile drawer state ──────────────────────
const Select = ({ children, value, onValueChange, defaultValue, open: controlledOpen, onOpenChange, ...props }) => {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Collect items from children for the drawer
  const [items, setItems] = React.useState([]);

  const handleDrawerValueChange = React.useCallback((val) => {
    onValueChange?.(val);
    setDrawerOpen(false);
  }, [onValueChange]);

  if (!isMobile) {
    return (
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        open={controlledOpen}
        onOpenChange={onOpenChange}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    );
  }

  return (
    <MobileSelectCtx.Provider value={{ drawerOpen, setDrawerOpen, value, handleDrawerValueChange, items, setItems }}>
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        // On mobile we prevent the Radix popup from opening; the trigger fires drawer instead
        open={false}
        onOpenChange={() => {}}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </MobileSelectCtx.Provider>
  );
};

const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

// ── Trigger: on mobile intercepts click to open drawer ───────────────────────
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(MobileSelectCtx);

  if (ctx) {
    return (
      <SelectPrimitive.Trigger
        ref={ref}
        className={cn(
          "flex h-11 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          ctx.setDrawerOpen(true);
        }}
        {...props}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
    );
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

// ── Content: on mobile renders a Vaul Drawer (bottom sheet) ──────────────────
const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const ctx = React.useContext(MobileSelectCtx);

  if (ctx) {
    // Register items from children into context so drawer can render them
    return (
      <>
        {/* Hidden Radix content to extract items – never visible */}
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            style={{ display: 'none' }}
            position={position}
          >
            <MobileItemCollector setItems={ctx.setItems}>
              {children}
            </MobileItemCollector>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>

        {/* Vaul Drawer bottom sheet */}
        <VaulDrawer.Root open={ctx.drawerOpen} onOpenChange={ctx.setDrawerOpen}>
          <VaulDrawer.Portal>
            <VaulDrawer.Overlay className="fixed inset-0 z-[200] bg-black/40" />
            <VaulDrawer.Content
              className="fixed bottom-0 left-0 right-0 z-[201] flex flex-col rounded-t-2xl bg-popover outline-none"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Handle bar */}
              <div className="mx-auto mt-3 mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
              <div className="overflow-y-auto max-h-[65vh] px-2 pb-4">
                <DrawerItems value={ctx.value} onValueChange={ctx.handleDrawerValueChange}>
                  {children}
                </DrawerItems>
              </div>
            </VaulDrawer.Content>
          </VaulDrawer.Portal>
        </VaulDrawer.Root>
      </>
    );
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

// ── Helper: traverse children to render drawer-friendly buttons ───────────────
function DrawerItems({ children, value, onValueChange }) {
  const items = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    // SelectItem
    if (child.type === SelectItem || child.props?.['data-select-item']) {
      const v = child.props.value;
      const label = child.props.children;
      items.push(
        <button
          key={v}
          type="button"
          className="flex min-h-[48px] w-full items-center justify-between rounded-xl px-4 py-3 text-sm text-popover-foreground hover:bg-accent active:bg-accent/70 transition-colors"
          onClick={() => onValueChange(v)}
        >
          <span>{label}</span>
          {value === v && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
        </button>
      );
    // SelectLabel
    } else if (child.type === SelectLabel) {
      items.push(
        <p key={`lbl-${child.props.children}`} className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {child.props.children}
        </p>
      );
    // SelectSeparator
    } else if (child.type === SelectSeparator) {
      items.push(<hr key={`sep-${items.length}`} className="my-1 border-muted" />);
    // SelectGroup – recurse
    } else if (child.type === SelectGroup) {
      items.push(
        <DrawerItems key={`grp-${items.length}`} value={value} onValueChange={onValueChange}>
          {child.props.children}
        </DrawerItems>
      );
    }
  });
  return <>{items}</>;
}

function MobileItemCollector({ children, setItems }) {
  return <>{children}</>;
}

// ── Standard item / label / separator (unchanged Radix) ──────────────────────
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}