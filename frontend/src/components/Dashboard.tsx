import { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  FileCheck,
  Eye,
  Download,
  Trash2,
  Calendar,
  Filter,
  RefreshCw,
  FileX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScanHistoryManager, type ScanHistoryItem } from "@/utils/scanHistory";

export default function Dashboard() {
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [filter, setFilter] = useState<
    "all" | "safe" | "malware" | "suspicious"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now()); // Force re-renders

  // Load history from localStorage on component mount
  useEffect(() => {
    console.log("Dashboard mounted, loading history...");
    loadHistory();
  }, []);

  useEffect(() => {
    const handleScanHistoryUpdate = (event: CustomEvent) => {
      console.log("🔔 Received scan history update event:", event.detail);
      loadHistoryQuiet(); // Reload history when FileUploader saves new scan
    };

    // Listen for custom events
    window.addEventListener(
      "scanHistoryUpdated",
      handleScanHistoryUpdate as EventListener
    );

    // Also listen for storage events (in case of other tabs)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "virus_scan_history") {
        console.log("💾 localStorage changed, reloading history");
        loadHistoryQuiet();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener(
        "scanHistoryUpdated",
        handleScanHistoryUpdate as EventListener
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Force update when lastUpdate changes
  useEffect(() => {
    if (lastUpdate > 0) {
      loadHistoryQuiet();
    }
  }, [lastUpdate]);

  const loadHistory = () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Attempting to load scan history...");
      const savedHistory = ScanHistoryManager.getHistory();
      console.log("Loaded history:", savedHistory);
      setHistory(savedHistory);

      if (savedHistory.length === 0) {
        console.log("No scan history found");
      }
    } catch (error) {
      console.error("Error loading history:", error);
      setError("Failed to load scan history");
    } finally {
      setLoading(false);
    }
  };

  // Load history without showing loading state
  const loadHistoryQuiet = () => {
    try {
      const savedHistory = ScanHistoryManager.getHistory();
      setHistory(savedHistory);
      console.log("Quietly reloaded history, count:", savedHistory.length);
    } catch (error) {
      console.error("Error quietly loading history:", error);
    }
  };

  // Force component to update
  const forceUpdate = () => {
    setLastUpdate(Date.now());
  };

  // Get updated stats from current history state
  const getStats = () => {
    try {
      return {
        totalScans: history.length,
        safeFiles: history.filter((h) => h.status === "safe").length,
        threatsDetected: history.filter((h) => h.status === "malware").length,
        avgScanTime:
          history.length > 0
            ? Math.round(
                history.reduce((acc, h) => acc + h.scanDuration, 0) /
                  history.length
              )
            : 0,
      };
    } catch (error) {
      console.error("Error calculating stats:", error);
      return {
        totalScans: 0,
        safeFiles: 0,
        threatsDetected: 0,
        avgScanTime: 0,
      };
    }
  };

  const stats = getStats();

  const filteredHistory =
    filter === "all" ? history : history.filter((h) => h.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "safe":
        return "text-green-600 bg-green-50 border-green-200";
      case "malware":
        return "text-red-600 bg-red-50 border-red-200";
      case "suspicious":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatFileSize = (size: number) => {
    if (size === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleRemoveItem = (id: string) => {
    try {
      console.log("Removing item:", id);
      const success = ScanHistoryManager.removeScan(id);
      if (success) {
        // Update state immediately
        setHistory((prev) => {
          const updated = prev.filter((item) => item.id !== id);
          console.log("Updated history after remove, count:", updated.length);
          return updated;
        });
        console.log("Item removed successfully");
      } else {
        setError("Failed to remove item");
      }
    } catch (error) {
      console.error("Error removing scan:", error);
      setError("Failed to remove item");
    }
  };

  const handleClearAllHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all scan history? This action cannot be undone."
      )
    ) {
      try {
        console.log("Clearing all history");
        const success = ScanHistoryManager.clearHistory();
        if (success) {
          setHistory([]); // Update state immediately
          console.log("All history cleared successfully");
        } else {
          setError("Failed to clear history");
        }
      } catch (error) {
        console.error("Error clearing history:", error);
        setError("Failed to clear history");
      }
    }
  };

  const handleExportHistory = () => {
    try {
      const exportData = ScanHistoryManager.exportHistory();
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scan-history-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("History exported successfully");
    } catch (error) {
      console.error("Error exporting history:", error);
      setError("Failed to export history");
    }
  };

  const handleViewDetails = (item: ScanHistoryItem) => {
    const details = `
File: ${item.fileName}
Type: ${item.fileType}
Size: ${formatFileSize(item.fileSize)}
Scan Date: ${item.scanDate.toLocaleString()}
Status: ${item.status.toUpperCase()}
Engines: ${item.enginesCount}
Threats Found: ${item.threatsFound}
Malicious: ${item.malicious}
Suspicious: ${item.suspicious}
Clean: ${item.clean}
Scan Duration: ${item.scanDuration}s
    `.trim();

    alert(details); // In a real app, you'd use a proper modal
  };

  // Debug functions
  const handleAddTestData = () => {
    try {
      console.log("Adding test data...");
      ScanHistoryManager.addTestData();
      // Force reload from localStorage
      forceUpdate();
      console.log("Test data added, forcing update");
    } catch (error) {
      console.error("Error adding test data:", error);
      setError("Failed to add test data");
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-500" />
          <p className="text-gray-600">Loading scan history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-gray-600">Monitor your file scanning activity</p>
          <p className="text-xs text-gray-500 mt-1">
            Current items in state: {history.length} | Last update:{" "}
            {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadHistory} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            onClick={handleExportHistory}
            className="gap-2"
            disabled={history.length === 0}
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
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
      </div>

      {/* History Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Scan History</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value="all">All Files ({history.length})</option>
                  <option value="safe">Safe Files ({stats.safeFiles})</option>
                  <option value="malware">
                    Malware ({stats.threatsDetected})
                  </option>
                  <option value="suspicious">
                    Suspicious (
                    {history.filter((h) => h.status === "suspicious").length})
                  </option>
                </select>
              </div>
              {history.length > 0 && (
                <Button
                  onClick={handleClearAllHistory}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <FileX className="w-4 h-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredHistory.map((item, index) => (
            <div
              key={`${item.id}-${index}`} // Ensure unique keys
              className="p-6 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    item.status
                  )}`}
                >
                  {item.status.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{item.fileName}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.scanDate.toLocaleDateString()}{" "}
                      {item.scanDate.toLocaleTimeString()}
                    </span>
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span>{item.scanDuration}s scan</span>
                    <span>{item.enginesCount} engines</span>
                    {item.threatsFound > 0 && (
                      <span className="text-red-600 font-medium">
                        {item.threatsFound} threats
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDetails(item)}
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                  title="Remove from History"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredHistory.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500">
            <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            {filter === "all" ? (
              <div>
                <p className="mb-2">No scan history found</p>
                <p className="text-sm">
                  Upload and scan files to see them here
                </p>
                <Button
                  onClick={handleAddTestData}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  Add Test Data
                </Button>
              </div>
            ) : (
              <p>No {filter} files found</p>
            )}
          </div>
        )}

        {/* Storage Info */}
        {history.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {filteredHistory.length} of {history.length} scans
              </span>
              <span>Data stored locally in your browser</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
