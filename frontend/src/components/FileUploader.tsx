// src/components/FileUploader.tsx - Исправленная версия с правильным сохранением
import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, AlertTriangle, Shield, Clock } from "lucide-react";
import { ScanningProgress } from "@/components/ScanningProgress";
import FileInfoCard from "@/components/FileInfoCard";
import { ScanHistoryManager } from "@/utils/scanHistory";

// Types
type ScanStatus =
  | "idle"
  | "uploading"
  | "scanning"
  | "completed"
  | "error"
  | "rate_limited";

type ReportResponse = {
  status: string;
  is_safe?: boolean;
  engines_count?: number;
  threats_found?: number;
  malicious?: number;
  suspicious?: number;
  clean?: number;
  message?: string;
};

type UploadResponse = {
  analysis_id: string;
  message?: string;
};

interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  hash?: string;
}

interface RateLimitStatus {
  can_upload: boolean;
  wait_time_seconds: number;
  last_request_ago: number;
  min_interval: number;
}

interface ScanResult {
  is_safe: boolean;
  threats_found: number;
  malicious: number;
  suspicious: number;
  clean: number;
  engines_count?: number;
}

export default function FileUploader() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [scanProgress, setScanProgress] = useState({
    currentEngine: "",
    enginesCompleted: 0,
    totalEngines: 20,
    elapsedTime: 0,
  });

  // Rate limiting
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitStatus | null>(
    null
  );
  const [countdown, setCountdown] = useState(0);

  // Debug info
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [analysisId, setAnalysisId] = useState<string>("");

  const [scanStartTime, setScanStartTime] = useState<number>(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  const API_BASE = "http://localhost:5000";

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Check rate limit status on component mount
  useEffect(() => {
    checkRateLimitStatus();
  }, []);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (status === "rate_limited") {
      setStatus("idle");
      checkRateLimitStatus();
    }

    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, [countdown, status]);

  // Progress simulation
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (status === "uploading") {
      setProgress(0);
      progressRef.current = 0;
      setDebugInfo("Starting file upload...");

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev >= 100 ? 100 : prev + 10;
          if (newProgress >= 100) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
          return newProgress;
        });
      }, 200);
    } else if (status === "scanning") {
      setProgress(0);
      progressRef.current = 0;
      setScanProgress((prev) => ({ ...prev, elapsedTime: 0 }));
      setScanStartTime(Date.now());
      setDebugInfo(`Starting scan with analysis ID: ${analysisId}`);

      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev >= 100 ? 100 : prev + 1;
          return newProgress;
        });

        setScanProgress((prev) => ({
          ...prev,
          elapsedTime: prev.elapsedTime + 1,
          enginesCompleted: Math.min(
            Math.floor((progressRef.current / 100) * prev.totalEngines),
            prev.totalEngines
          ),
          currentEngine: getRandomEngine(),
        }));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, analysisId]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (countdownRef.current) {
        clearTimeout(countdownRef.current);
      }
    };
  }, []);

  const getRandomEngine = () => {
    const engines = [
      "Windows Defender",
      "Kaspersky",
      "Norton",
      "McAfee",
      "Bitdefender",
      "Avast",
      "AVG",
      "Trend Micro",
      "Symantec",
      "ESET",
    ];
    return engines[Math.floor(Math.random() * engines.length)];
  };

  const checkRateLimitStatus = async () => {
    try {
      const response = await axios.get<RateLimitStatus>(`${API_BASE}/status`);
      setRateLimitInfo(response.data);

      if (!response.data.can_upload && response.data.wait_time_seconds > 0) {
        setCountdown(response.data.wait_time_seconds);
        setStatus("rate_limited");
      }
    } catch (err) {
      console.log("Could not check rate limit status");
    }
  };

  const testBackendConnection = async () => {
    try {
      setDebugInfo("Testing backend connection...");
      const response = await axios.get(`${API_BASE}/`);
      setDebugInfo("Backend connection successful");
      return true;
    } catch (err) {
      setError(
        "Backend server is not running. Please start the Flask server on port 5000."
      );
      setDebugInfo("Backend connection failed: " + (err as Error).message);
      return false;
    }
  };

  // Функция для сохранения результата сканирования
  const saveScanResult = (
    reportData: ReportResponse,
    fileData: FileInfo,
    duration: number
  ) => {
    try {
      console.log("🔄 Attempting to save scan result to localStorage...");
      console.log("📄 File data:", fileData);
      console.log("📊 Report data:", reportData);
      console.log("⏱️ Duration:", duration);

      // Проверяем, что у нас есть все необходимые данные
      if (!fileData || !reportData) {
        console.error("❌ Missing file or report data");
        return false;
      }

      // Создаем объект для сохранения
      const scanData = {
        fileName: fileData.name,
        fileSize: fileData.size,
        fileType: fileData.type,
        threatsFound: reportData.threats_found || 0,
        enginesCount: reportData.engines_count || 0,
        malicious: reportData.malicious || 0,
        suspicious: reportData.suspicious || 0,
        clean: reportData.clean || 0,
        scanDuration: duration,
      };

      console.log("💾 Saving scan data:", scanData);

      // Сохраняем в localStorage
      const success = ScanHistoryManager.addScanResult(scanData);

      if (success) {
        console.log("✅ Scan result saved successfully to localStorage!");

        // Отправляем событие для обновления Dashboard
        window.dispatchEvent(
          new CustomEvent("scanHistoryUpdated", {
            detail: { action: "added", data: scanData },
          })
        );

        return true;
      } else {
        console.error("❌ Failed to save scan result");
        return false;
      }
    } catch (error) {
      console.error("💥 Error saving scan result:", error);
      return false;
    }
  };

  const uploadFile = async (fileToUpload: File) => {
    // Check rate limit before uploading
    await checkRateLimitStatus();

    if (rateLimitInfo && !rateLimitInfo.can_upload) {
      setStatus("rate_limited");
      setCountdown(rateLimitInfo.wait_time_seconds);
      setError(
        `Rate limited. Please wait ${rateLimitInfo.wait_time_seconds} seconds before uploading.`
      );
      return;
    }

    setStatus("uploading");
    setError(null);
    setProgress(0);
    setDebugInfo("");

    // Test backend connection first
    const backendOk = await testBackendConnection();
    if (!backendOk) {
      setStatus("error");
      return;
    }

    // Create file info
    const info: FileInfo = {
      name: fileToUpload.name,
      size: fileToUpload.size,
      type: fileToUpload.type || "application/octet-stream",
      lastModified: new Date(fileToUpload.lastModified),
      hash: generateMockHash(),
    };
    setFileInfo(info);

    try {
      setDebugInfo("Uploading file to VirusTotal...");
      const formData = new FormData();
      formData.append("file", fileToUpload);

      const response = await axios.post<UploadResponse>(
        `${API_BASE}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        }
      );

      const newAnalysisId = response.data.analysis_id;
      setAnalysisId(newAnalysisId);

      if (!newAnalysisId) {
        throw new Error("No analysis ID received from server");
      }

      setDebugInfo(`File uploaded successfully. Analysis ID: ${newAnalysisId}`);
      setStatus("scanning");
      await pollForResults(newAnalysisId);
    } catch (err: any) {
      console.error("Upload error:", err);

      if (err.response?.status === 409) {
        setError(
          "VirusTotal is busy. Free accounts can only scan one file at a time. Please wait 2-3 minutes and try again."
        );
        setStatus("rate_limited");
        setCountdown(180);
      } else if (err.response?.status === 429) {
        setError(
          "Rate limit exceeded. Please wait before uploading another file."
        );
        setStatus("rate_limited");
        setCountdown(60);
      } else if (err.code === "ECONNABORTED") {
        setError("Upload timeout. File might be too large or server is slow.");
      } else if (err.response?.status === 413) {
        setError("File too large. Maximum size is 32MB.");
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(`Upload failed: ${err.message}`);
      }

      setDebugInfo(`Upload error: ${err.message}`);
      setStatus("error");

      setTimeout(checkRateLimitStatus, 1000);
    }
  };

  const generateMockHash = () => {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  };

  const pollForResults = async (currentAnalysisId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async (): Promise<void> => {
      try {
        attempts++;
        setDebugInfo(
          `Polling attempt ${attempts}/${maxAttempts} for analysis ${currentAnalysisId}`
        );

        const response = await axios.get<ReportResponse>(
          `${API_BASE}/report/${currentAnalysisId}`,
          {
            timeout: 10000,
          }
        );

        setDebugInfo(
          `Poll response: Status=${response.data.status}, Safe=${response.data.is_safe}`
        );

        if (response.data.status === "completed") {
          setReport(response.data);
          setStatus("completed");
          setProgress(100);
          setDebugInfo("Scan completed successfully!");

          // 🔥 ГЛАВНОЕ ИСПРАВЛЕНИЕ: Сохраняем результат в localStorage
          if (fileInfo && response.data.is_safe !== undefined) {
            const scanDuration = Math.floor(
              (Date.now() - scanStartTime) / 1000
            );

            console.log("📝 Saving completed scan result...");
            const saveSuccess = saveScanResult(
              response.data,
              fileInfo,
              scanDuration
            );

            if (saveSuccess) {
              setDebugInfo("✅ Scan completed and saved to history!");
            } else {
              setDebugInfo("⚠️ Scan completed but failed to save to history");
            }
          } else {
            console.warn(
              "⚠️ Missing file info or scan result, cannot save to history"
            );
          }

          return;
        }

        // Still processing
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setError(
            `Scan timeout after ${
              maxAttempts * 2
            } seconds. The file might be large or VirusTotal is busy.`
          );
          setDebugInfo(`Timeout reached after ${attempts} attempts`);
          setStatus("error");
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        if (err.code === "ECONNABORTED") {
          setError("Connection timeout while checking results.");
        } else if (err.response?.status === 404) {
          setError("Analysis not found. The scan might have failed.");
        } else {
          setError(`Failed to get scan results: ${err.message}`);
        }
        setDebugInfo(`Polling error: ${err.message}`);
        setStatus("error");
      }
    };

    poll();
  };

  // Convert ReportResponse to ScanResult for the FileInfoCard
  const getScanResult = (): ScanResult | undefined => {
    if (!report || report.is_safe === undefined) return undefined;

    return {
      is_safe: report.is_safe,
      threats_found: report.threats_found || 0,
      malicious: report.malicious || 0,
      suspicious: report.suspicious || 0,
      clean: report.clean || 0,
      engines_count: report.engines_count || 0,
    };
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
    maxSize: 32 * 1024 * 1024,
    disabled:
      status === "uploading" ||
      status === "scanning" ||
      status === "rate_limited",
  });

  const reset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setStatus("idle");
    setFile(null);
    setFileInfo(null);
    setReport(null);
    setError(null);
    setProgress(0);
    setDebugInfo("");
    setAnalysisId("");
    setCountdown(0);
    setScanProgress({
      currentEngine: "",
      enginesCompleted: 0,
      totalEngines: 20,
      elapsedTime: 0,
    });
    setScanStartTime(0);

    checkRateLimitStatus();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Virus Scanner</h1>
        <p className="text-gray-600">Upload a file to scan for malware</p>
      </div>

      {/* Rate Limit Warning */}
      {status === "rate_limited" && countdown > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="font-medium text-orange-800">Rate Limited</h3>
              <p className="text-sm text-orange-700">
                Please wait {countdown} seconds before uploading another file.
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Free VirusTotal accounts can only process one file at a time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      {debugInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Debug:</strong> {debugInfo}
          </p>
          {analysisId && (
            <p className="text-xs text-blue-600 mt-1">
              Analysis ID: {analysisId}
            </p>
          )}
        </div>
      )}

      {/* Upload Area */}
      {status === "idle" && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-black bg-gray-50"
              : "border-gray-300 hover:border-black"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
          </p>
          <p className="text-gray-600">or click to select a file</p>
          <p className="text-sm text-gray-500 mt-2">Max file size: 32MB</p>

          {rateLimitInfo && (
            <p className="text-xs text-gray-500 mt-2">
              {rateLimitInfo.can_upload
                ? "✓ Ready to upload"
                : `⏳ Wait ${rateLimitInfo.wait_time_seconds}s`}
            </p>
          )}
        </div>
      )}

      {/* File Info Card */}
      {fileInfo &&
        (status === "uploading" ||
          status === "scanning" ||
          status === "completed") && (
          <FileInfoCard
            file={fileInfo}
            scanProgress={{
              status,
              progress,
              currentEngine: scanProgress.currentEngine,
              enginesCompleted: scanProgress.enginesCompleted,
              totalEngines: scanProgress.totalEngines,
              elapsedTime: scanProgress.elapsedTime,
            }}
            scanResult={getScanResult()}
          />
        )}

      {/* Scanning Progress */}
      {status === "scanning" && (
        <ScanningProgress
          progress={progress}
          currentEngine={scanProgress.currentEngine}
          enginesCompleted={scanProgress.enginesCompleted}
          totalEngines={scanProgress.totalEngines}
        />
      )}

      {/* Status Display for uploading */}
      {status === "uploading" && (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-black" />
          <p className="text-lg font-medium">Uploading file...</p>
          <p className="text-gray-600">{file?.name}</p>
        </div>
      )}

      {/* Results */}
      {status === "completed" && report && report.is_safe !== undefined && (
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            {report.is_safe ? (
              <Shield className="w-8 h-8 text-green-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h3 className="text-xl font-semibold">
                {report.is_safe ? "File is Safe" : "Threats Detected"}
              </h3>
              <p className="text-gray-600">{file?.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Engines scanned:</span>{" "}
              {report.engines_count || 0}
            </div>
            <div
              className={
                (report.threats_found || 0) > 0
                  ? "text-red-600"
                  : "text-green-600"
              }
            >
              <span className="font-medium">Threats found:</span>{" "}
              {report.threats_found || 0}
            </div>
            <div className={(report.malicious || 0) > 0 ? "text-red-600" : ""}>
              <span className="font-medium">Malicious:</span>{" "}
              {report.malicious || 0}
            </div>
            <div
              className={(report.suspicious || 0) > 0 ? "text-orange-600" : ""}
            >
              <span className="font-medium">Suspicious:</span>{" "}
              {report.suspicious || 0}
            </div>
            <div className="text-green-600">
              <span className="font-medium">Clean:</span> {report.clean || 0}
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Scan completed and saved to history!
            </p>
            <p className="text-xs text-green-600 mt-1">
              Go to Dashboard tab to view your scan history
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <p className="text-lg font-medium text-red-600">Error</p>
          <p className="text-gray-600 mb-4">{error}</p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left text-sm">
            <h4 className="font-medium text-yellow-800 mb-2">
              Common Solutions:
            </h4>
            <ul className="text-yellow-700 space-y-1">
              <li>
                • <strong>Error 409:</strong> Wait 2-3 minutes, then try again
              </li>
              <li>
                • <strong>Rate limit:</strong> Free accounts: 1 file at a time
              </li>
              <li>
                • <strong>Large files:</strong> Try files under 10MB first
              </li>
              <li>
                • <strong>Backend issues:</strong> Restart Flask server
              </li>
              <li>
                • <strong>API key:</strong> Check your .env file
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Reset Button */}
      {(status === "completed" || status === "error") && (
        <div className="text-center">
          <Button onClick={reset} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Scan Another File
          </Button>
        </div>
      )}

      {/* Rate Limit Info */}
      {rateLimitInfo && status === "idle" && (
        <div className="text-center text-xs text-gray-500">
          {rateLimitInfo.can_upload ? (
            <p>
              ✓ Ready to upload (last scan: {rateLimitInfo.last_request_ago}s
              ago)
            </p>
          ) : (
            <p>
              ⏳ Please wait {rateLimitInfo.wait_time_seconds} seconds before
              next upload
            </p>
          )}
        </div>
      )}
    </div>
  );
}
