import { useState } from "react";
import "./App.css";
import FileUploader from "./components/FileUploader";
import Dashboard from "./components/Dashboard";
import { Button } from "./components/ui/button";
import { Upload, BarChart3, Shield } from "lucide-react";

type ActiveTab = 'scanner' | 'dashboard';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('scanner');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-black" />
              <span className="text-xl font-bold">SecureScanner</span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4">
              <Button
                variant={activeTab === 'scanner' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('scanner')}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Scanner
              </Button>
              
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('dashboard')}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-8">
        {activeTab === 'scanner' && <FileUploader />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 SecureScanner. Keep your files safe.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;