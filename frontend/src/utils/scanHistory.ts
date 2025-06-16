// src/utils/scanHistory.ts - Complete localStorage implementation
export interface ScanHistoryItem {
  id: string;
  fileName: string;
  scanDate: Date;
  status: "safe" | "malware" | "suspicious";
  threatsFound: number;
  fileSize: number;
  scanDuration: number;
  fileType: string;
  enginesCount: number;
  malicious: number;
  suspicious: number;
  clean: number;
}

const STORAGE_KEY = 'virus_scan_history';

export class ScanHistoryManager {
  // Get all scan history from localStorage
  static getHistory(): ScanHistoryItem[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available');
        return [];
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log('No scan history found in localStorage');
        return [];
      }
      
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        console.warn('Invalid scan history format, resetting');
        localStorage.removeItem(STORAGE_KEY);
        return [];
      }

      // Convert date strings back to Date objects
      const history = parsed.map((item: any) => ({
        ...item,
        scanDate: new Date(item.scanDate)
      }));

      console.log(`Loaded ${history.length} scan history items from localStorage`);
      return history;
    } catch (error) {
      console.error('Error loading scan history:', error);
      // Clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.error('Could not clear corrupted localStorage');
      }
      return [];
    }
  }

  // Add new scan result to history
  static addScanResult(scanResult: {
    fileName: string;
    fileSize: number;
    fileType: string;
    threatsFound: number;
    enginesCount: number;
    malicious: number;
    suspicious: number;
    clean: number;
    scanDuration: number;
  }): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available');
        return false;
      }

      const history = this.getHistory();
      
      // Determine status based on threats
      let status: "safe" | "malware" | "suspicious";
      if (scanResult.malicious > 0) {
        status = "malware";
      } else if (scanResult.suspicious > 0) {
        status = "suspicious";
      } else {
        status = "safe";
      }

      const newItem: ScanHistoryItem = {
        id: this.generateId(),
        fileName: scanResult.fileName,
        scanDate: new Date(),
        status,
        threatsFound: scanResult.threatsFound,
        fileSize: scanResult.fileSize,
        scanDuration: scanResult.scanDuration,
        fileType: scanResult.fileType,
        enginesCount: scanResult.enginesCount,
        malicious: scanResult.malicious,
        suspicious: scanResult.suspicious,
        clean: scanResult.clean
      };

      // Add to beginning of array (most recent first)
      history.unshift(newItem);
      
      // Keep only last 100 entries to prevent localStorage from getting too large
      const limitedHistory = history.slice(0, 100);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
      console.log('Scan result saved to localStorage:', newItem);
      return true;
    } catch (error) {
      console.error('Error saving scan result:', error);
      return false;
    }
  }

  // Remove specific scan from history
  static removeScan(id: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      const history = this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      console.log('Scan removed from localStorage:', id);
      return true;
    } catch (error) {
      console.error('Error removing scan:', error);
      return false;
    }
  }

  // Clear all history
  static clearHistory(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      localStorage.removeItem(STORAGE_KEY);
      console.log('All scan history cleared from localStorage');
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  // Get statistics from history
  static getStats(): {
    totalScans: number;
    safeFiles: number;
    threatsDetected: number;
    avgScanTime: number;
  } {
    const history = this.getHistory();
    
    const stats = {
      totalScans: history.length,
      safeFiles: history.filter(h => h.status === "safe").length,
      threatsDetected: history.filter(h => h.status === "malware").length,
      avgScanTime: history.length > 0 
        ? Math.round(history.reduce((acc, h) => acc + h.scanDuration, 0) / history.length)
        : 0
    };

    console.log('Calculated stats:', stats);
    return stats;
  }

  // Generate unique ID
  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Export history as JSON
  static exportHistory(): string {
    const history = this.getHistory();
    return JSON.stringify(history, null, 2);
  }

  // Import history from JSON
  static importHistory(jsonData: string): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      const imported = JSON.parse(jsonData);
      if (Array.isArray(imported)) {
        // Validate and convert dates
        const validatedHistory = imported.map((item: any) => ({
          ...item,
          scanDate: new Date(item.scanDate)
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validatedHistory));
        console.log('History imported successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing history:', error);
      return false;
    }
  }

  // Add some test data for debugging
  static addTestData(): void {
    console.log('Adding test data to localStorage');
    
    const testItems = [
      {
        fileName: "test-safe-file.pdf",
        fileSize: 1024000,
        fileType: "application/pdf",
        threatsFound: 0,
        enginesCount: 64,
        malicious: 0,
        suspicious: 0,
        clean: 64,
        scanDuration: 15
      },
      {
        fileName: "suspicious-file.exe",
        fileSize: 2048000,
        fileType: "application/x-executable",
        threatsFound: 2,
        enginesCount: 64,
        malicious: 1,
        suspicious: 1,
        clean: 62,
        scanDuration: 23
      },
      {
        fileName: "clean-document.docx",
        fileSize: 512000,
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        threatsFound: 0,
        enginesCount: 64,
        malicious: 0,
        suspicious: 0,
        clean: 64,
        scanDuration: 12
      }
    ];

    testItems.forEach(item => {
      this.addScanResult(item);
    });
  }

  // Debug function to check localStorage
  static debugLocalStorage(): void {
    console.log('=== LocalStorage Debug ===');
    console.log('localStorage available:', typeof window !== 'undefined' && !!window.localStorage);
    
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('Raw localStorage data:', stored);
        
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('Parsed data:', parsed);
          console.log('Data type:', typeof parsed);
          console.log('Is array:', Array.isArray(parsed));
          console.log('Length:', parsed.length);
        } else {
          console.log('No data found in localStorage');
        }
      } catch (error) {
        console.error('Error reading localStorage:', error);
      }
    }
    console.log('=== End Debug ===');
  }
}