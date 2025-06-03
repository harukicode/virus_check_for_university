import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, AlertTriangle, Shield } from 'lucide-react';

// Types
type ScanStatus = 'idle' | 'uploading' | 'scanning' | 'completed' | 'error';

type ScanStats = {
  "confirmed-timeout": number;
  failure: number;
  harmless: number;
  malicious: number;
  suspicious: number;
  timeout: number;
  "type-unsupported": number;
  undetected: number;
}

type ReportResponse = {
  status: string;
  stats: ScanStats;
  is_safe: boolean;
  scan_date: number;
  engines_count: number;
}

type UploadResponse = {
  analysis_id: string;
}

export default function FileUploader() {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:5000';

  const uploadFile = async (fileToUpload: File) => {
    setStatus('uploading');
    setError(null);

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

  const pollForResults = async (analysisId: string) => {
    const maxAttempts = 30; 
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        const response = await axios.get<ReportResponse>(`${API_BASE}/report/${analysisId}`);
        
        if (response.data.status === 'completed') {
          setReport(response.data);
          setStatus('completed');
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
    setStatus('idle');
    setFile(null);
    setReport(null);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Virus Scanner</h1>
        <p className="text-muted-foreground">Upload a file to scan for malware</p>
      </div>

      {/* Upload Area */}
      {status === 'idle' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
          </p>
          <p className="text-muted-foreground">or click to select a file</p>
          <p className="text-sm text-muted-foreground mt-2">Max file size: 32MB</p>
        </div>
      )}

      {/* Status Display */}
      {status === 'uploading' && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-lg font-medium">Uploading file...</p>
          <p className="text-muted-foreground">{file?.name}</p>
        </div>
      )}

      {status === 'scanning' && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-lg font-medium">Scanning file...</p>
          <p className="text-muted-foreground">This may take up to a minute</p>
        </div>
      )}

      {/* Results */}
      {status === 'completed' && report && (
        <div className="border rounded-lg p-6">
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
              <p className="text-muted-foreground">{file?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Engines scanned:</span> {report.engines_count}
            </div>
            <div>
              <span className="font-medium">Malicious:</span> {report.stats.malicious}
            </div>
            <div>
              <span className="font-medium">Suspicious:</span> {report.stats.suspicious}
            </div>
            <div>
              <span className="font-medium">Clean:</span> {report.stats.undetected}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <p className="text-lg font-medium text-red-600">Error</p>
          <p className="text-muted-foreground">{error}</p>
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