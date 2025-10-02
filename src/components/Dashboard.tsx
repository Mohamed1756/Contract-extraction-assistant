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

const Dashboard = ({ onBack, initialContracts }: DashboardProps) => {
  const [currentContract, setCurrentContract] = useState<ContractData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (initialContracts && initialContracts.length > 0) {
      setCurrentContract(initialContracts[0]);
    }
  }, [initialContracts]);

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
        <div className="max-w-4xl mx-auto px-8">
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
      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contract Analysis</h1>
          <p className="text-gray-600">{currentContract.filename || 'Unknown Contract'}</p>
          <p className="text-sm text-gray-500 mt-1">
            Analyzed on {new Date(currentContract.extraction_timestamp).toLocaleString()}
          </p>
        </div>

        {uploadError && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {uploadError}
          </div>
        )}

        {/* Fields Grid */}
        <div className="grid gap-6">
          {OPEN_SOURCE_FIELDS.map((field) => {
            const fieldData = currentContract.analysis[field.key];
            const value = fieldData?.value || 'Not Found';
            const source = fieldData?.source || '';
            const confidence = fieldData?.confidence || '';

            return (
              <div key={field.key} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
                    <p className="text-sm text-gray-500">{field.description}</p>
                  </div>
                  {confidence && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      confidence === 'high' ? 'bg-green-100 text-green-700' :
                      confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {confidence}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className={`text-base ${value === 'Not Found' ? 'text-gray-400 italic' : 'text-gray-900 font-medium'}`}>
                    {value}
                  </p>
                  {source && value !== 'Not Found' && (
                    <details className="mt-3">
                      <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
                        View source text
                      </summary>
                      <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
                        {source}
                      </p>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Open Source Version</h3>
          <p className="text-sm text-blue-800">
            This is the lite version displaying 4 key contract fields. The analysis uses a hybrid llm+regex extraction 
            to identify important terms from your contract documents. Always verify - this is just a tool. 
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
