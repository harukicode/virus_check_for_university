import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, AlertTriangle, Shield } from 'lucide-react';
import { ScanningProgress } from '@/components/ScanningProgress';
import FileInfoCard from '@/components/FileInfoCard';

// Types - обновленные под новый API
type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'completed' | 'error';

type ReportResponse = {
  status: string;
  is_safe: boolean;
  engines_count: number;
  threats_found: number;
  malicious: number;
  suspicious: number;
  clean: number;
}

type UploadResponse = {
  analysis_id: string;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  hash?: string;
}

export default function FileUploader() {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState({
    currentEngine: '',
    enginesCompleted: 0,
    totalEngines: 20,
    elapsedTime: 0
  });

  // Используем useRef для хранения ссылки на интервал
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  const API_BASE = 'http://localhost:5000';

  // Обновляем ref когда progress меняется
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Симуляция прогресса сканирования - ИСПРАВЛЕННАЯ ВЕРСИЯ
  useEffect(() => {
    // Очищаем предыдущий интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (status === 'uploading') {
      setProgress(0);
      progressRef.current = 0;
      
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev >= 100 ? 100 : prev + 10;
          console.log('Upload progress:', newProgress);
          if (newProgress >= 100) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
          return newProgress;
        });
      }, 200);
      
    } else if (status === 'scanning') {
      setProgress(0);
      progressRef.current = 0;
      setScanProgress(prev => ({ ...prev, elapsedTime: 0 }));
      
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev >= 100 ? 100 : prev + 2;
          if (newProgress >= 100) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
          return newProgress;
        });
        
        setScanProgress(prev => ({
          ...prev,
          elapsedTime: prev.elapsedTime + 1,
          // ИСПРАВЛЕНО: используем текущее значение progress через ref
          enginesCompleted: Math.min(
            Math.floor((progressRef.current / 100) * prev.totalEngines), 
            prev.totalEngines
          ),
          currentEngine: getRandomEngine()
        }));
      }, 1000);
    }

    // Cleanup функция
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status]); // ИСПРАВЛЕНО: убрали progress из зависимостей

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getRandomEngine = () => {
    const engines = [
      'Windows Defender',
      'Kaspersky',
      'Norton',
      'McAfee',
      'Bitdefender',
      'Avast',
      'AVG',
      'Trend Micro',
      'Symantec',
      'ESET'
    ];
    return engines[Math.floor(Math.random() * engines.length)];
  };

  const uploadFile = async (fileToUpload: File) => {
    setStatus('uploading');
    setError(null);
    setProgress(0);

    // Создаем информацию о файле
    const info: FileInfo = {
      name: fileToUpload.name,
      size: fileToUpload.size,
      type: fileToUpload.type || 'application/octet-stream',
      lastModified: new Date(fileToUpload.lastModified),
      hash: generateMockHash()
    };
    setFileInfo(info);

    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const response = await axios.post<UploadResponse>(`${API_BASE}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const analysisId = response.data.analysis_id;
      
      setStatus('scanning');
      await pollForResults(analysisId);

    } catch (err) {
      setError('Failed to upload file');
      setStatus('error');
    }
  };

  const generateMockHash = () => {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  };

  const pollForResults = async (analysisId: string) => {
    const maxAttempts = 30; 
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await axios.get<ReportResponse>(`${API_BASE}/report/${analysisId}`);
        
        if (response.data.status === 'completed') {
          setReport(response.data);
          setStatus('completed');
          setProgress(100);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); 
        } else {
          setError('Scan timeout');
          setStatus('error');
        }
      } catch (err) {
        setError('Failed to get scan results');
        setStatus('error');
      }
    };

    poll();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      if (selectedFile) {
        setFile(selectedFile);
        uploadFile(selectedFile);
      }
    },
    maxFiles: 1,
    disabled: status === 'uploading' || status === 'scanning'
  });

  const reset = () => {
    // Очищаем интервал при сбросе
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setStatus('idle');
    setFile(null);
    setFileInfo(null);
    setReport(null);
    setError(null);
    setProgress(0);
    setScanProgress({
      currentEngine: '',
      enginesCompleted: 0,
      totalEngines: 20,
      elapsedTime: 0
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Virus Scanner</h1>
        <p className="text-gray-600">Upload a file to scan for malware</p>
      </div>

      {/* Upload Area */}
      {status === 'idle' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-black'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
          </p>
          <p className="text-gray-600">or click to select a file</p>
          <p className="text-sm text-gray-500 mt-2">Max file size: 32MB</p>
        </div>
      )}

      {/* File Info Card - показываем когда есть файл */}
      {fileInfo && (status === 'uploading' || status === 'scanning' || status === 'completed') && (
        <FileInfoCard
          file={fileInfo}
          scanProgress={{
            status,
            progress,
            currentEngine: scanProgress.currentEngine,
            enginesCompleted: scanProgress.enginesCompleted,
            totalEngines: scanProgress.totalEngines,
            elapsedTime: scanProgress.elapsedTime
          }}
          scanResult={report || undefined}
        />
      )}

      {/* Scanning Progress - альтернативный вид для сканирования */}
      {status === 'scanning' && (
        <ScanningProgress
          progress={progress}
          currentEngine={scanProgress.currentEngine}
          enginesCompleted={scanProgress.enginesCompleted}
          totalEngines={scanProgress.totalEngines}
        />
      )}

      {/* Status Display для uploading */}
      {status === 'uploading' && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-black" />
          <p className="text-lg font-medium">Uploading file...</p>
          <p className="text-gray-600">{file?.name}</p>
        </div>
      )}

      {/* Results */}
      {status === 'completed' && report && (
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            {report.is_safe ? (
              <Shield className="w-8 h-8 text-green-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h3 className="text-xl font-semibold">
                {report.is_safe ? 'File is Safe' : 'Threats Detected'}
              </h3>
              <p className="text-gray-600">{file?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Engines scanned:</span> {report.engines_count}
            </div>
            <div className={report.threats_found > 0 ? "text-red-600" : "text-green-600"}>
              <span className="font-medium">Threats found:</span> {report.threats_found}
            </div>
            <div className={report.malicious > 0 ? "text-red-600" : ""}>
              <span className="font-medium">Malicious:</span> {report.malicious}
            </div>
            <div className={report.suspicious > 0 ? "text-orange-600" : ""}>
              <span className="font-medium">Suspicious:</span> {report.suspicious}
            </div>
            <div className="text-green-600">
              <span className="font-medium">Clean:</span> {report.clean}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <p className="text-lg font-medium text-red-600">Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      )}

      {/* Reset Button */}
      {(status === 'completed' || status === 'error') && (
        <div className="text-center">
          <Button onClick={reset} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Scan Another File
          </Button>
        </div>
      )}
    </div>
  );
}