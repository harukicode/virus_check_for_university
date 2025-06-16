// src/types/scan.ts - Create shared types file
export interface ScanResult {
  is_safe: boolean;
  threats_found: number;
  malicious: number;
  suspicious: number;
  clean: number;
  engines_count?: number;
}

export interface ReportResponse {
  status: string;
  is_safe?: boolean;
  engines_count?: number;
  threats_found?: number;
  malicious?: number;
  suspicious?: number;
  clean?: number;
  message?: string;
}

export interface UploadResponse {
  analysis_id: string;
  message?: string;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  hash?: string;
}

export type ScanStatus =
  | "idle"
  | "uploading"
  | "scanning"
  | "completed"
  | "error"
  | "rate_limited";

export interface ScanProgress {
  status: ScanStatus;
  progress: number;
  currentEngine?: string;
  enginesCompleted?: number;
  totalEngines?: number;
  elapsedTime?: number;
}

export interface RateLimitStatus {
  can_upload: boolean;
  wait_time_seconds: number;
  last_request_ago: number;
  min_interval: number;
}
