import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn("input-default w-full rounded-lg border px-3 py-2", className)}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
