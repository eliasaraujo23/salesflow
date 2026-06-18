import { cn } from "@/lib/utils"
import * as React from "react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-7 w-full rounded-sm border bg-input px-3 py-1 text-xs shadow-inner transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:shadow-sm focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
