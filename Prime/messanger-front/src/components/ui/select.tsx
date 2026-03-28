import * as React from "react";
import { cn } from "@/lib/utils";

// These are lightweight stubs – for production you may want to use RadixUI or similar.

interface BaseProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export interface SelectProps extends BaseProps {
  value?: any;
  onValueChange?: (value: any) => void;
}

export const Select: React.FC<SelectProps> = ({ children, className, ...props }) => (
  <div className={cn("select-root", className)} {...props}>
    {children}
  </div>
);

export const SelectTrigger: React.FC<BaseProps> = ({ children, className, ...props }) => (
  <div className={cn("select-trigger", className)} {...props}>
    {children}
  </div>
);

export const SelectValue: React.FC<BaseProps> = ({ children, className, ...props }) => (
  <div className={cn("select-value", className)} {...props}>
    {children}
  </div>
);

export const SelectContent: React.FC<BaseProps> = ({ children, className, ...props }) => (
  <div className={cn("select-content", className)} {...props}>
    {children}
  </div>
);

export interface SelectItemProps extends BaseProps {
  value?: string;
}

export const SelectItem: React.FC<SelectItemProps> = ({ children, className, ...props }) => (
  <div className={cn("select-item", className)} {...props}>
    {children}
  </div>
);
