import React, { useState } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  FileCheck, 
  Clock, 
  Eye,
  Download,
  Trash2,
  Calendar,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ScanHistory {
  id: string
  fileName: string
  scanDate: Date
  status: 'safe' | 'malware' | 'suspicious'
  threatsFound: number
  fileSize: number
  scanDuration: number
}

const mockHistory: ScanHistory[] = [
  {
    id: '1',
    fileName: 'document.pdf',
    scanDate: new Date('2025-01-10'),
    status: 'safe',
    threatsFound: 0,
    fileSize: 2.5,
    scanDuration: 15
  },
  {
    id: '2',
    fileName: 'suspicious_file.exe',
    scanDate: new Date('2025-01-09'),
    status: 'malware',
    threatsFound: 3,
    fileSize: 12.8,
    scanDuration: 28
  },
  {
    id: '3',
    fileName: 'image.jpg',
    scanDate: new Date('2025-01-08'),
    status: 'safe',
    threatsFound: 0,
    fileSize: 0.8,
    scanDuration: 8
  },
  {
    id: '4',
    fileName: 'presentation.pptx',
    scanDate: new Date('2025-01-07'),
    status: 'suspicious',
    threatsFound: 1,
    fileSize: 5.2,
    scanDuration: 22
  },
  {
    id: '5',
    fileName: 'archive.zip',
    scanDate: new Date('2025-01-06'),
    status: 'safe',
    threatsFound: 0,
    fileSize: 15.3,
    scanDuration: 45
  }
]

export default function Dashboard() {
  const [history, setHistory] = useState(mockHistory)
  const [filter, setFilter] = useState<'all' | 'safe' | 'malware' | 'suspicious'>('all')

  const stats = {
    totalScans: history.length,
    safeFiles: history.filter(h => h.status === 'safe').length,
    threatsDetected: history.filter(h => h.status === 'malware').length,
    avgScanTime: Math.round(history.reduce((acc, h) => acc + h.scanDuration, 0) / history.length)
  }

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(h => h.status === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-600 bg-green-50 border-green-200'
      case 'malware': return 'text-red-600 bg-red-50 border-red-200'
      case 'suspicious': return 'text-orange-600 bg-orange-50 border-orange-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatFileSize = (size: number) => {
    return `${size.toFixed(1)} MB`
  }

  const handleRemoveItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-gray-600">Monitor your file scanning activity</p>
        </div>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Scans</p>
              <p className="text-2xl font-bold">{stats.totalScans}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Safe Files</p>
              <p className="text-2xl font-bold">{stats.safeFiles}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Threats Found</p>
              <p className="text-2xl font-bold">{stats.threatsDetected}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Scan Time</p>
              <p className="text-2xl font-bold">{stats.avgScanTime}s</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Scan History</h2>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="all">All Files</option>
                <option value="safe">Safe Files</option>
                <option value="malware">Malware</option>
                <option value="suspicious">Suspicious</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredHistory.map((item) => (
            <div key={item.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                  {item.status.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{item.fileName}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.scanDate.toLocaleDateString()}
                    </span>
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span>{item.scanDuration}s scan</span>
                    {item.threatsFound > 0 && (
                      <span className="text-red-600 font-medium">
                        {item.threatsFound} threats
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredHistory.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No files found for this filter</p>
          </div>
        )}
      </div>
    </div>
  )
}