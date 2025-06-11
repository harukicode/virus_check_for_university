import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number
    max?: number
  }
>(({ className, value = 0, max = 100, ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuemax={max}
    aria-valuemin={0}
    aria-valuenow={value}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out"
      style={{
        transform: `translateX(-${100 - (value || 0)}%)`,
      }}
    />
  </div>
))
Progress.displayName = "Progress"

interface ScanningProgressProps {
  progress: number
  currentEngine?: string
  enginesCompleted?: number
  totalEngines?: number
}

function ScanningProgress({ 
  progress, 
  currentEngine,
  enginesCompleted,
  totalEngines 
}: ScanningProgressProps) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 relative">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
        <div 
          className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ animationDuration: '1s' }}
        ></div>
      </div>
      <p className="text-lg font-medium mb-2">Scanning file...</p>
      <p className="text-muted-foreground mb-4">
        {currentEngine ? `Analyzing with ${currentEngine}` : 'Analyzing with multiple engines'}
      </p>
      <div className="max-w-xs mx-auto">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
        {enginesCompleted && totalEngines && (
          <p className="text-xs text-muted-foreground mt-1">
            {enginesCompleted} of {totalEngines} engines completed
          </p>
        )}
      </div>
    </div>
  )
}

export { Progress, ScanningProgress }