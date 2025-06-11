import * as React from "react"
import { clsx } from "clsx"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number
    max?: number
  }
>(({ className, value = 0, max = 100, ...props }, ref) => {
  // Убеждаемся, что percentage находится в диапазоне 0-100
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemax={max}
      aria-valuemin={0}
      aria-valuenow={value}
      className={clsx(
        "relative h-2 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-black transition-all duration-300 ease-in-out"
        style={{
          width: `${percentage}%`,
        }}
      />
    </div>
  )
})
Progress.displayName = "Progress"

export { Progress }