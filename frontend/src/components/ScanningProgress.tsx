import { Progress } from "./progress"

interface ScanningProgressProps {
  progress: number
  currentEngine?: string
  enginesCompleted?: number
  totalEngines?: number
}

export function ScanningProgress({ 
  progress, 
  currentEngine,
  enginesCompleted,
  totalEngines 
}: ScanningProgressProps) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 mx-auto mb-4 relative">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div 
          className="absolute inset-0 rounded-full border-4 border-black border-t-transparent animate-spin"
          style={{ animationDuration: '1s' }}
        ></div>
      </div>
      <p className="text-lg font-medium mb-2">Scanning file...</p>
      <p className="text-gray-600 mb-4">
        {currentEngine ? `Analyzing with ${currentEngine}` : 'Analyzing with multiple engines'}
      </p>
      <div className="max-w-xs mx-auto">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-gray-600 mt-2">{progress}% complete</p>
        {enginesCompleted && totalEngines && (
          <p className="text-xs text-gray-600 mt-1">
            {enginesCompleted} of {totalEngines} engines completed
          </p>
        )}
      </div>
    </div>
  )
}