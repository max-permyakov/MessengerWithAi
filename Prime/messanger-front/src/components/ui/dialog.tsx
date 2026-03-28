import * as React from "react";
import { cn } from "@/lib/utils";

// basic dialog components; in a real app swap for Radix UI or Headless UI

export interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dialog: React.FC<DialogProps> = ({ children, className, ...props }) => (
  <div className={cn("dialog-root", className)} {...props}>
    {children}
  </div>
);

export interface DialogTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, className, ...props }) => (
  <div className={cn("dialog-trigger", className)} {...props}>
    {children}
  </div>
);

export const DialogContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("dialog-content max-w-md p-4 bg-white text-black rounded-lg", className)} {...props}>
    {children}
  </div>
);

export const DialogHeader = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("dialog-header mb-4", className)} {...props}>
    {children}
  </div>
);

export const DialogTitle = ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-lg font-semibold", className)} {...props}>
    {children}
  </h2>
);
