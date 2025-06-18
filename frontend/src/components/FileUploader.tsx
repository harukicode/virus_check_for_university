
import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Upload,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  HardDrive,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/progress";
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

  // Utility functions
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

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

  const generateMockHash = () => {
    return Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
  };

  // Effects
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

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

  const saveScanResult = (
    reportData: ReportResponse,
    fileData: FileInfo,
    duration: number
  ) => {
    try {
      console.log("🔄 Attempting to save scan result to localStorage...");

      if (!fileData?.name || !reportData || reportData.is_safe === undefined) {
        console.error("❌ Missing critical data");
        return false;
      }

      const scanData = {
        fileName: fileData.name,
        fileSize: fileData.size || 0,
        fileType: fileData.type || "unknown",
        threatsFound: reportData.threats_found || 0,
        enginesCount: reportData.engines_count || 0,
        malicious: reportData.malicious || 0,
        suspicious: reportData.suspicious || 0,
        clean: reportData.clean || 0,
        scanDuration: duration || 0,
      };

      console.log("💾 Saving scan data:", scanData);

      const success = ScanHistoryManager.addScanResult(scanData);

      if (success) {
        console.log("✅ Scan result saved successfully to localStorage!");

        const event = new CustomEvent("scanHistoryUpdated", {
          detail: { action: "added", data: scanData },
        });
        window.dispatchEvent(event);
        console.log("📡 Event dispatched for dashboard update");

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

    const backendOk = await testBackendConnection();
    if (!backendOk) {
      setStatus("error");
      return;
    }

    const info: FileInfo = {
      name: fileToUpload.name,
      size: fileToUpload.size,
      type: fileToUpload.type || "application/octet-stream",
      lastModified: new Date(fileToUpload.lastModified),
      hash: generateMockHash(),
    };

    console.log("📁 Setting file info:", info);
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

      await pollForResults(newAnalysisId, info);
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

  const pollForResults = async (
    currentAnalysisId: string,
    currentFileInfo?: FileInfo
  ) => {
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

          const finalFileInfo = currentFileInfo || fileInfo;

          console.log("📋 Final file info for saving:", finalFileInfo);
          console.log("📊 Response data:", response.data);

          if (finalFileInfo && response.data.is_safe !== undefined) {
            const scanDuration = Math.floor(
              (Date.now() - scanStartTime) / 1000
            );

            console.log("📝 All data ready, saving scan result...");
            const saveSuccess = saveScanResult(
              response.data,
              finalFileInfo,
              scanDuration
            );

            if (saveSuccess) {
              setDebugInfo("✅ Scan completed and saved to history!");
            } else {
              setDebugInfo("⚠️ Scan completed but failed to save to history");
            }
          } else {
            console.warn("⚠️ Missing file info or scan result");
            setDebugInfo("⚠️ Scan completed but cannot save - missing data");
          }

          return;
        }

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

  // Status-specific rendering functions
  const renderStatusIcon = () => {
    switch (status) {
      case "uploading":
        return <Clock className="w-8 h-8 text-blue-500 animate-pulse" />;
      case "scanning":
        return <Zap className="w-8 h-8 text-yellow-500 animate-pulse" />;
      case "completed":
        return report?.is_safe ? (
          <CheckCircle className="w-8 h-8 text-green-500" />
        ) : (
          <AlertTriangle className="w-8 h-8 text-red-500" />
        );
      case "error":
      case "rate_limited":
        return <AlertTriangle className="w-8 h-8 text-red-500" />;
      default:
        return <Upload className="w-12 h-12 text-gray-500" />;
    }
  };

  const renderStatusText = () => {
    switch (status) {
      case "uploading":
        return "Uploading file...";
      case "scanning":
        return `Scanning with ${
          scanProgress.currentEngine || "antivirus engines"
        }...`;
      case "completed":
        return report?.is_safe ? "File is safe!" : "Threats detected!";
      case "error":
        return "Scan failed";
      case "rate_limited":
        return "Rate limited";
      default:
        return isDragActive ? "Drop the file here" : "Drag & drop a file here";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return report?.is_safe ? "text-green-600" : "text-red-600";
      case "error":
      case "rate_limited":
        return "text-red-600";
      case "uploading":
      case "scanning":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Virus Scanner</h1>
        <p className="text-gray-600">Upload a file to scan for malware</p>
      </div>

      {/* Main Upload/Scan Area */}
      <div
        {...(status === "idle" ? getRootProps() : {})}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          status === "idle"
            ? isDragActive
              ? "border-black bg-gray-50 cursor-pointer"
              : "border-gray-300 hover:border-black cursor-pointer"
            : status === "completed"
            ? report?.is_safe
              ? "border-green-300 bg-green-50"
              : "border-red-300 bg-red-50"
            : status === "error" || status === "rate_limited"
            ? "border-red-300 bg-red-50"
            : "border-blue-300 bg-blue-50"
        }`}
      >
        {status === "idle" && <input {...getInputProps()} />}

        {/* Icon */}
        <div className="mb-4 ml-64">{renderStatusIcon()}</div>

        {/* Status Text */}
        <p className={`text-lg font-medium mb-2 ${getStatusColor()}`}>
          {renderStatusText()}
        </p>

        {/* File Info */}
        {fileInfo && status !== "idle" && (
          <div className="mb-4 text-sm text-gray-600">
            <p className="font-medium truncate">{fileInfo.name}</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatFileSize(fileInfo.size)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {fileInfo.lastModified.toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {(status === "uploading" || status === "scanning") && (
          <div className="mb-4">
            <Progress value={progress} className="h-3 mb-2" />
            <p className="text-sm text-gray-600">{progress}% complete</p>
            {status === "scanning" && (
              <div className="text-xs text-gray-500 mt-1">
                <p>
                  {scanProgress.enginesCompleted} of {scanProgress.totalEngines}{" "}
                  engines
                  {scanProgress.elapsedTime > 0 &&
                    ` • ${formatTime(scanProgress.elapsedTime)} elapsed`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scan Results */}
        {status === "completed" && report && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {report.clean || 0}
                </div>
                <div className="text-gray-500">Clean</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {report.suspicious || 0}
                </div>
                <div className="text-gray-500">Suspicious</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {report.malicious || 0}
                </div>
                <div className="text-gray-500">Malicious</div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>Scanned by {report.engines_count || 0} engines</p>
              {(report.threats_found || 0) > 0 && (
                <p className="text-red-600 font-medium mt-1">
                  ⚠️ {report.threats_found} threat
                  {(report.threats_found || 0) > 1 ? "s" : ""} detected
                </p>
              )}
            </div>

            {report.is_safe && (
              <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Scan completed and saved to history!
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Go to Dashboard tab to view your scan history
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {status === "error" && (
          <div className="mt-4">
            <p className="text-red-600 mb-4">{error}</p>
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
              </ul>
            </div>
          </div>
        )}

        {/* Rate Limited */}
        {status === "rate_limited" && (
          <div className="mt-4">
            <p className="text-orange-600 mb-2">
              Please wait {countdown} seconds before uploading another file
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${
                    (((rateLimitInfo?.min_interval || 60) - countdown) /
                      (rateLimitInfo?.min_interval || 60)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Idle state instructions */}
        {status === "idle" && (
          <div className="text-gray-600">
            <p>or click to select a file</p>
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
      </div>

      {/* Reset Button */}
      {(status === "completed" || status === "error") && (
        <div className="text-center">
          <Button onClick={reset} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Scan Another File
          </Button>
        </div>
      )}
    </div>
  );
}
