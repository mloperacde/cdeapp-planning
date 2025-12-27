// src/components/ui/toaster.jsx - Para shadcn/ui
import { Toaster as SonnerToaster } from "sonner";

export function Toaster({ ...props }) {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
        },
      }}
      {...props}
    />
  );
}
