import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, FileText, Download, Loader2, AlertCircle, FileUp, Copy, Check, FileText as FileTextIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import DecorativeBackground from './DecorativeBackground';


// --- START: INTERFACES AND TYPES ---

interface ExtractionField {
  value: string;
  source: string;
  page_number?: number | null;
  reference_snippet?: string | null;
  confidence?: string;
  [key: string]: unknown;
}

export interface ContractAnalysis {
  start_date?: ExtractionField;
  end_date?: ExtractionField;
  termination_notice_period?: ExtractionField;
  renewal_terms?: ExtractionField;

  [key: string]: ExtractionField | undefined;
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
};

const Dashboard = ({ onBack, initialContracts }: DashboardProps) => {
  const [contracts, setContracts] = useState<ContractData[]>(initialContracts ?? []);
  const [currentContract, setCurrentContract] = useState<ContractData | null>(
    initialContracts && initialContracts.length > 0 ? initialContracts[0] : null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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

// --- START: UPDATED PDF EXPORT FUNCTION ---
const exportAsPDF = () => {
  if (!currentContract) return;

  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let cursorY = 0; // Use a cursor to track Y position

  // Define colors (mapping from Tailwind for consistency)
  const colors = {
    primaryText: [15, 23, 42],   // slate-900
    secondaryText: [71, 85, 105], // slate-600
    headerBg: [241, 245, 249],  // slate-100
    borderColor: [226, 232, 240] // slate-200
  };

  // --- 1. Report Header ---
  doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setFontSize(20);
  doc.setTextColor(colors.primaryText[0], colors.primaryText[1], colors.primaryText[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Contract Analysis Report', margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondaryText[0], colors.secondaryText[1], colors.secondaryText[2]);
  doc.text(`File: ${currentContract.filename || 'Untitled Document'}`, margin, 30);
  doc.text(`Analyzed on: ${new Date(currentContract.extraction_timestamp).toLocaleString()}`, margin, 35);
  
  cursorY = 55; // Set cursor below the header

  // --- 2. Performance Summary Section ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primaryText[0], colors.primaryText[1], colors.primaryText[2]);
  doc.text('Performance Summary', margin, cursorY);
  cursorY += 8;

  const performanceData = [
    ['Pages Analysed:', currentContract.pages_analysed ?? '—'],
    ['Execution Time:', formatSeconds(currentContract.performance_metrics?.execution_time_seconds) || '—'],
    ['Peak Memory Usage:', formatMegabytes(currentContract.performance_metrics?.peak_memory_usage_mb) || '—']
  ];
  
  // FIX: Call autoTable as a function, passing `doc`
  autoTable(doc, {
      startY: cursorY,
      body: performanceData,
      theme: 'plain',
      styles: {
          fontSize: 10,
          cellPadding: { top: 1, right: 2, bottom: 1, left: 0 },
      },
      columnStyles: {
          0: { 
            fontStyle: 'bold', 
            textColor: colors.primaryText as [number, number, number] // Type assertion to fix the type error
          },
          1: { 
            textColor: colors.secondaryText as [number, number, number] // Type assertion to fix the type error
          }
      },
  });
  
  // Get Y position after the summary table to start the next table
  cursorY = (doc as any).lastAutoTable.finalY + 15;

  // --- 3. Key Contract Terms Table ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primaryText[0], colors.primaryText[1], colors.primaryText[2]);
  doc.text('Key Contract Terms', margin, cursorY);
  cursorY += 8;
  
  const tableData = OPEN_SOURCE_FIELDS.map(field => {
    const fieldData = currentContract.analysis[field.key];
   
    return [
      field.label,
      fieldData?.value || 'Not found',
      fieldData?.source || 'N/A',
      
    ];
  });
  
  // FIX: Call autoTable as a function, passing `doc`
  autoTable(doc, {
    startY: cursorY,
    head: [['Field', 'Extracted Value', 'Source']],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: colors.headerBg as [number, number, number],
      textColor: colors.secondaryText as [number, number, number],
      fontSize: 10,
      fontStyle: 'bold' as const,
      cellPadding: 2,
    },
    bodyStyles: {
      textColor: colors.primaryText as [number, number, number],
      fontSize: 10,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: colors.borderColor as [number, number, number],
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255] as [number, number, number]
    },
    columnStyles: {
      0: { 
        cellWidth: 40, 
        fontStyle: 'bold',
        textColor: colors.primaryText as [number, number, number]
      },
      1: { 
        cellWidth: 'auto', // Allow this column to wrap and take remaining space
        textColor: colors.primaryText as [number, number, number]
      },
      2: { 
        cellWidth: 25,
        textColor: colors.secondaryText as [number, number, number]
      },
      3: { 
        cellWidth: 25,
        textColor: colors.secondaryText as [number, number, number]
      }
    },
    // --- 4. Footer on Every Page ---
    didDrawPage: (data: any) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(9);
      doc.setTextColor(colors.secondaryText[0], colors.secondaryText[1], colors.secondaryText[2]);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
    }
  });
  
  // --- 5. Save the PDF ---
  doc.save(`${currentContract.filename?.replace('.pdf', '') || 'contract'}_analysis.pdf`);
};
// --- END: UPDATED PDF EXPORT FUNCTION ---


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
      
      {/* GitHub Banner */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-2 text-center text-sm">
        <div className="container mx-auto flex items-center justify-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 7.07c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          <span>Loving this tool? Give it a star on GitHub to support our work! </span>
          <a 
            href="https://github.com/Qleric-labs/contract-extraction-assistant" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="ml-2 font-medium text-white underline hover:text-gray-200 transition-colors"
          >
            Star now ⭐
          </a>
        </div>
      </div>
      
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
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button onClick={exportAsPDF} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center">
                    <FileTextIcon className="w-4 h-4 mr-2" />
                    <span>Export as PDF</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
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
                const pageNumber = fieldData?.page_number;
                const referenceSnippet = fieldData?.reference_snippet;
                const confidence = fieldData?.confidence || '';
                const sourceBadgeClass = source
                  ? SOURCE_BADGE_STYLES[source] || 'bg-gray-50 text-gray-600 border border-gray-200'
                  : '';

                return (
                  <div key={field.key} className="bg-white border border-gray-200 rounded-none p-5 transition-all duration-200 ease-in-out hover:shadow-sm overflow-hidden">
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
                      <div className="flex items-start justify-between">
                        <p
                          className={`text-sm leading-relaxed ${
                            value === 'Not Found' ? 'text-gray-400 italic' : 'text-gray-800'
                          }`}
                        >
                          {value}
                        </p>
                        {value !== 'Not Found' && (
                          <button
                            onClick={() => copyToClipboard(value, field.key)}
                            className="text-gray-400 hover:text-gray-600 transition-colors ml-2 p-1 -mt-1 -mr-1"
                            title="Copy to clipboard"
                          >
                            {copiedField === field.key ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                      {(source || typeof pageNumber === 'number' || referenceSnippet) && value !== 'Not Found' && (
                        <div className="relative">
                          <details className="group">
                            <summary className="text-xs font-medium text-gray-600 cursor-pointer select-none list-none mt-2 inline-block hover:text-gray-800 transition-colors">
                              View source details
                            </summary>
                            <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-md text-sm text-gray-600 space-y-3">
                              <div className="overflow-hidden">
                              {typeof pageNumber === 'number' && (
                                <div className="text-[11px] uppercase tracking-wide text-gray-500">
                                  Page {pageNumber}
                                </div>
                              )}
                              <div className="text-xs font-semibold text-gray-500">
                                Extraction: {source || 'Not available'}
                              </div>
                              {referenceSnippet ? (
                                <div className="mt-2 text-sm leading-relaxed break-words whitespace-normal overflow-hidden bg-white p-2 rounded border border-gray-200">
                                  {(() => {
                                    const value = fieldData?.value || '';
                                    if (!value) return referenceSnippet;
                                    
                                    const regex = new RegExp(`(${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                                    const parts = referenceSnippet.split(regex);
                                    
                                    return parts.map((part, i) => 
                                      part.toLowerCase() === value.toLowerCase() ? (
                                        <mark key={i} className="bg-yellow-100 text-gray-900 px-0.5 rounded">
                                          {part}
                                        </mark>
                                      ) : (
                                        <span key={i}>{part}</span>
                                      )
                                    );
                                  })()}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 italic">
                                  Reference snippet unavailable.
                                </div>
                              )}
                              </div>
                            </div>
                          </details>
                        </div>
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
                This is the lite version displaying 4 key contract fields. The analysis uses a hybrid llm+regex extraction. If you find this useful, please <a href="https://github.com/Qleric-labs/contract-extraction-assistant" target="_blank" rel="noopener noreferrer" className="font-medium underline">star this repo</a>.
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