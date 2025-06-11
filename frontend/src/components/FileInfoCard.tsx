import { 
  File, 
  Calendar, 
  HardDrive, 
  Hash, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'
import { Progress } from './ScanningProgress'

interface FileInfo {
  name: string
  size: number
  type: string
  lastModified: Date
  hash?: string
}

type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'completed' | 'error'

interface ScanProgress {
  status: ScanStatus
  progress: number
  currentEngine?: string
  enginesCompleted?: number
  totalEngines?: number
  elapsedTime?: number
}

interface ScanResult {
  is_safe: boolean
  threats_found: number
  malicious: number
  suspicious: number
  clean: number
}

interface FileInfoCardProps {
  file: FileInfo
  scanProgress: ScanProgress
  scanResult?: ScanResult
}

export default function FileInfoCard({ file, scanProgress, scanResult }: FileInfoCardProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getFileIcon = (type: string) => {
    return <File className="w-8 h-8 text-blue-500" />
  }

  const getStatusIcon = () => {
    switch (scanProgress.status) {
      case 'uploading':
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
      case 'scanning':
        return <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
      case 'completed':
        return scanResult?.is_safe 
          ? <CheckCircle className="w-5 h-5 text-green-500" />
          : <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      default:
        return <Shield className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (scanProgress.status) {
      case 'uploading':
        return 'Uploading file...'
      case 'scanning':
        return `Scanning with ${scanProgress.currentEngine || 'antivirus engines'}...`
      case 'completed':
        return scanResult?.is_safe ? 'File is safe' : 'Threats detected'
      case 'error':
        return 'Scan failed'
      default:
        return 'Ready to scan'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm">
      {/* File Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          {getFileIcon(file.type)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{file.name}</h3>
          <p className="text-sm text-gray-600">{file.type}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {getStatusIcon()}
          <span className={`font-medium ${
            scanProgress.status === 'completed' && scanResult?.is_safe 
              ? 'text-green-600' 
              : scanProgress.status === 'completed' && !scanResult?.is_safe
              ? 'text-red-600'
              : 'text-gray-600'
          }`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {(scanProgress.status === 'uploading' || scanProgress.status === 'scanning') && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{scanProgress.progress}%</span>
          </div>
          <Progress value={scanProgress.progress} className="h-2" />
          {scanProgress.status === 'scanning' && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {scanProgress.enginesCompleted || 0} of {scanProgress.totalEngines || 0} engines
              </span>
              {scanProgress.elapsedTime && (
                <span>{formatTime(scanProgress.elapsedTime)} elapsed</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* File Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500">Size:</span>
          <span className="font-medium">{formatFileSize(file.size)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-gray-500">Modified:</span>
          <span className="font-medium">{file.lastModified.toLocaleDateString()}</span>
        </div>

        {file.hash && (
          <div className="flex items-center gap-2 col-span-2">
            <Hash className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Hash:</span>
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded truncate">
              {file.hash}
            </span>
          </div>
        )}
      </div>

      {/* Scan Results */}
      {scanProgress.status === 'completed' && scanResult && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Scan Results</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{scanResult.clean}</div>
              <div className="text-gray-500">Clean</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{scanResult.suspicious}</div>
              <div className="text-gray-500">Suspicious</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{scanResult.malicious}</div>
              <div className="text-gray-500">Malicious</div>
            </div>
          </div>
          
          {scanResult.threats_found > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  {scanResult.threats_found} threat{scanResult.threats_found > 1 ? 's' : ''} detected
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                This file contains malicious content and should not be executed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}