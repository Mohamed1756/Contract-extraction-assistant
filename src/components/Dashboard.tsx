import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, FileText, Download, Loader2, AlertCircle, FileUp
} from 'lucide-react';
import DecorativeBackground from './DecorativeBackground';

// --- START: INTERFACES AND TYPES ---
// Open-source version: Only 6 fields
export interface ContractAnalysis {
  start_date?: { value: string; source: string; confidence?: string };
  end_date?: { value: string; source: string; confidence?: string };
  termination_notice_period?: { value: string; source: string; confidence?: string };
  renewal_terms?: { value: string; source: string; confidence?: string };
 
  [key: string]: any; // Allow other fields but we'll only display the 4
}

export interface ContractData {
  extraction_timestamp: string;
  contract_type: string;
  filename?: string;
  file_size?: number;
  pages_analysed?: number;
  full_text?: string;
  performance_metrics?: {
    execution_time_seconds?: string;
    peak_memory_usage_mb?: string;
    [key: string]: any;
  };
  analysis: ContractAnalysis;
}

interface DashboardProps {
  onBack: () => void;
  initialContracts?: ContractData[] | null;
}

// The 6 open-source fields we'll display
const OPEN_SOURCE_FIELDS = [
  { key: 'start_date', label: 'Start Date', description: 'Contract start date' },
  { key: 'end_date', label: 'End Date', description: 'Contract end date' },
  { key: 'termination_notice_period', label: 'Termination Notice Period', description: 'Required notice period for termination' },
  { key: 'renewal_terms', label: 'Renewal Terms', description: 'Contract renewal conditions' },
  
];

const SOURCE_BADGE_STYLES: Record<string, string> = {
  Inference: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  Regex: 'bg-sky-50 text-sky-700 border border-sky-100',
  'System Fallback': 'bg-amber-50 text-amber-700 border border-amber-100',
};

const Dashboard = ({ onBack, initialContracts }: DashboardProps) => {
  const [contracts, setContracts] = useState<ContractData[]>(initialContracts ?? []);
  const [currentContract, setCurrentContract] = useState<ContractData | null>(
    initialContracts && initialContracts.length > 0 ? initialContracts[0] : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString();
  const formatSeconds = (value?: string) => {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return `${parsed.toFixed(parsed < 1 ? 3 : 2)} s`;
    }
    return `${value} s`;
  };
  const formatMegabytes = (value?: string) => {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return `${parsed.toFixed(parsed < 1 ? 2 : 2)} MB`;
    }
    return `${value} MB`;
  };

  useEffect(() => {
    if (initialContracts && initialContracts.length > 0) {
      setContracts(initialContracts);
      setCurrentContract(initialContracts[0]);
    }
  }, [initialContracts]);

  const upsertContracts = (newData: ContractData[]) => {
    setContracts((prev) => {
      const combined = [...newData, ...prev];
      const seen = new Set<string>();
      return combined.filter((item) => {
        const key = `${item.filename || 'contract'}-${item.extraction_timestamp}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF file only.');
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      setUploadError('File size must be less than 16MB.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 59000);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const apiUrl = 'http://localhost:5000/api/analyze-contract';
      const response = await fetch(apiUrl, { method: 'POST', body: formData, signal });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyse contract');
      }
      const analysisData: ContractData = await response.json();
      analysisData.file_size = file.size;
      setCurrentContract(analysisData);
      upsertContracts([analysisData]);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to analyse contract. Please try again.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
      clearTimeout(timeoutId);
    }
  };

  // Export functions
  const exportAsJSON = () => {
    if (!currentContract) return;
    const data = {
      filename: currentContract.filename,
      extraction_timestamp: currentContract.extraction_timestamp,
      fields: OPEN_SOURCE_FIELDS.reduce((acc, field) => {
        const fieldData = currentContract.analysis[field.key];
        acc[field.key] = fieldData?.value || 'Not Found';
        return acc;
      }, {} as Record<string, string>)
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, `${currentContract.filename || 'contract'}_analysis.json`);
  };

  const exportAsCSV = () => {
    if (!currentContract) return;
    let csv = 'Field,Value\n';
    OPEN_SOURCE_FIELDS.forEach(field => {
      const fieldData = currentContract.analysis[field.key];
      const value = (fieldData?.value || 'Not Found').replace(/"/g, '""');
      csv += `"${field.label}","${value}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, `${currentContract.filename || 'contract'}_analysis.csv`);
  };

  const exportAsText = () => {
    if (!currentContract) return;
    let text = `Contract Analysis: ${currentContract.filename || 'Unknown'}\n`;
    text += `Extraction Time: ${new Date(currentContract.extraction_timestamp).toLocaleString()}\n\n`;
    OPEN_SOURCE_FIELDS.forEach(field => {
      const fieldData = currentContract.analysis[field.key];
      text += `${field.label}: ${fieldData?.value || 'Not Found'}\n`;
    });
    const blob = new Blob([text], { type: 'text/plain' });
    downloadFile(blob, `${currentContract.filename || 'contract'}_analysis.txt`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!currentContract) {
    return (
      <div className="min-h-screen bg-[#F3F3EE] flex items-center justify-center font-editorial">
        <div className="text-center max-w-md mx-auto p-8">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-editorial-medium text-gray-800 mb-2">No Contract Data</h2>
          <p className="text-gray-500 mb-6">Upload a PDF contract to begin AI-powered analysis</p>
          {uploadError && <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">{uploadError}</div>}
          <label className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors cursor-pointer font-editorial-medium ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-forest-600 hover:bg-forest-700'} text-white`}>
            {isUploading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Analysing...</span></>) : (<><FileUp className="w-5 h-5" /><span>Upload Contract</span></>)}
            <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
          </label>
          <p className="text-xs text-gray-500 mt-2">PDF files only, max 16MB</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F3EE] font-editorial text-gray-800">
      <DecorativeBackground />
      
      {/* Header */}
      <header className="bg-[#FCFCF9]/80 backdrop-blur-sm sticky top-0 z-40 border-b border-gray-300">
        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-16">
            <button onClick={onBack} className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
            
            <div className="flex items-center space-x-3">
              {/* Export Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button onClick={exportAsJSON} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">Export as JSON</button>
                  <button onClick={exportAsCSV} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">Export as CSV</button>
                  <button onClick={exportAsText} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">Export as Text</button>
                </div>
              </div>
              
              <label className={`flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg transition-all cursor-pointer text-sm font-medium ${isUploading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                {isUploading ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>) : (<><FileUp className="w-4 h-4" /><span>Upload New</span></>)}
                <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 md:px-10 py-12">
        <div className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Contract Analysis</h1>
            <p className="text-sm text-gray-600 mt-1">{currentContract.filename || 'Unknown Contract'}</p>
          </div>
          <div className="text-xs md:text-sm text-gray-500">
            Analyzed on {formatTimestamp(currentContract.extraction_timestamp)}
          </div>
        </div>

        {uploadError && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p className="text-sm font-medium">{uploadError}</p>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div>
            {/* Fields Grid */}
            <div className="grid gap-5">
              {OPEN_SOURCE_FIELDS.map((field) => {
                const fieldData = currentContract.analysis[field.key];
                const value = fieldData?.value || 'Not Found';
                const source = fieldData?.source || '';
                const confidence = fieldData?.confidence || '';
                const sourceBadgeClass = source
                  ? SOURCE_BADGE_STYLES[source] || 'bg-gray-50 text-gray-600 border border-gray-200'
                  : '';

                return (
                  <div key={field.key} className="bg-white border border-gray-200 rounded-none p-5 transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-0.5">
                        <h3 className="text-base font-semibold text-gray-900">{field.label}</h3>
                        <p className="text-xs text-gray-500">{field.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {source && (
                          <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${sourceBadgeClass}`}>
                            {source}
                          </span>
                        )}
                        {confidence && (
                          <span className={`px-2 py-0.5 text-[11px] rounded-full border ${
                            confidence === 'high'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : confidence === 'medium'
                              ? 'bg-amber-50 border-amber-100 text-amber-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}>
                            {confidence}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className={`text-sm leading-relaxed ${
                        value === 'Not Found' ? 'text-gray-400 italic' : 'text-gray-800'
                      }`}>
                        {value}
                      </p>
                      {source && value !== 'Not Found' && (
                        <details className="rounded-md border border-gray-200 bg-gray-50/80 p-3">
                          <summary className="text-xs font-medium text-gray-600 cursor-pointer select-none">View source snippet</summary>
                          <div className="mt-2 max-h-48 overflow-y-auto pr-1 text-sm text-gray-600 whitespace-pre-wrap">
                            {source}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-none">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Open Source Version</h3>
              <p className="text-sm text-blue-800">
                This is the lite version displaying 4 key contract fields. The analysis uses a hybrid llm+regex extraction 
                to identify important terms from your contract documents. Always verify - this is just a tool. 
              </p>
            </div>
          </div>

          <aside className="mt-8 lg:mt-0 space-y-5">
            <div className="p-6 rounded-none border border-gray-900 bg-transparent">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 tracking-wide uppercase">Performance Summary</h2>
              <div className="space-y-4 text-sm text-gray-700">
                <div>
                  <p className="uppercase tracking-wide text-[11px] text-gray-700">Pages analysed</p>
                  <p className="text-base font-semibold text-gray-900">{currentContract.pages_analysed ?? '—'}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-[11px] text-gray-700">Execution time</p>
                  <p className="text-base font-semibold text-gray-900">{formatSeconds(currentContract.performance_metrics?.execution_time_seconds) || '—'}</p>
                </div>
                <div>
                  <p className="uppercase tracking-wide text-[11px] text-gray-700">Peak memory usage</p>
                  <p className="text-base font-semibold text-gray-900">{formatMegabytes(currentContract.performance_metrics?.peak_memory_usage_mb) || '—'}</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-none border border-gray-900 bg-forest-50/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 tracking-wide uppercase">Batch Results</h2>
                <span className="text-xs font-medium text-gray-800 bg-white/70 px-2 py-0.5 border border-gray-300">
                  {contracts.length} analysed
                </span>
              </div>
              {contracts.length === 0 ? (
                <p className="text-xs text-gray-500">Upload contracts in batch to see them here.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {contracts.map((contract) => {
                    const isActive = contract === currentContract;
                    return (
                      <button
                        key={`${contract.filename || 'contract'}-${contract.extraction_timestamp}`}
                        onClick={() => setCurrentContract(contract)}
                        className={`w-full text-left p-3 rounded-none border transition-colors text-sm ${
                          isActive
                            ? 'border-gray-900 bg-white text-gray-900 shadow-sm'
                            : 'border-gray-300 bg-white/80 hover:border-gray-500 hover:bg-white shadow-sm/50'
                        }`}
                      >
                        <p className="font-semibold truncate text-gray-800">
                          {contract.filename || 'Contract'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimestamp(contract.extraction_timestamp)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
