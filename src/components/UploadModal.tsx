import React, { useState, useMemo } from 'react';
import { 
  X, Upload, FileText, Loader2, CheckCircle, AlertCircle, FileSignature, 
  Trash2, File as FileIcon, FileUp, ChevronDown, ChevronUp, 
  FileCode, Cpu, Handshake, Settings, Star, Award, Package, PackagePlus,
  Layers
} from 'lucide-react';

// Interfaces remain the same from the original file
interface ExtractionField {
  value: string;
  source: string;
  page_number?: number | null;
  reference_snippet?: string | null;
  confidence?: string;
  [key: string]: unknown;
}

interface ContractAnalysis {
  renewal_terms?: ExtractionField;
  end_date?: ExtractionField;
  start_date?: ExtractionField;
  termination_notice_period?: ExtractionField;

  [key: string]: ExtractionField | undefined;
}

interface ContractData {
  extraction_timestamp: string;
  contract_type: string;
  filename?: string;
  file_size?: number;
  analysis: ContractAnalysis;
}

interface FileQueueItem {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'analyzing' | 'success' | 'error';
    progress: number;
    error?: string;
    analysisData?: ContractData;
}


interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (data: ContractData[]) => void;
}
// Sample contract data with categories
const SAMPLE_CONTRACTS = [
  // License Agreements

  {
    label: 'Trademark License - Arconic',
    filename: 'License_Agreements copy/ArconicRolledProductsCorp_20191217_10-12B_EX-2.7_11923804_EX-2.7_Trademark License Agreement.pdf',
    icon: FileSignature,
    category: 'License Agreements',
    date: '2019',
    type: 'Trademark'
  },
  {
    label: 'Therapeutic License - Artara',
    filename: 'License_Agreements copy/ArtaraTherapeuticsInc_20200110_8-K_EX-10.5_11943350_EX-10.5_License Agreement.pdf',
    icon: FileCode,
    category: 'License Agreements',
    date: '2020',
    type: 'Pharma'
  },
  {
    label: 'Content License - China Real Estate',
    filename: 'License_Agreements copy/ChinaRealEstateInformationCorp_20090929_F-1_EX-10.32_4771615_EX-10.32_Content License Agreement.pdf',
    icon: FileText,
    category: 'License Agreements',
    date: '2009',
    type: 'Content License'
  },
  
 
 
  // Sponsorship Agreements
  {
    label: 'Esports Sponsorship',
    filename: 'License_Agreements copy/AlliedEsportsEntertainmentInc.pdf',
    icon: Star,
    category: 'Sponsorship',
    date: '2019',
    type: 'Esports'
  },
  {
    label: 'ARC Group Sponsorship',
    filename: 'Sponsorship copy/ArcGroupInc_20171211_8-K_EX-10.1_10976103_EX-10.1_Sponsorship Agreement.pdf',
    icon: Award,
    category: 'Sponsorship',
    date: '2017',
    type: 'Corporate'
  },
  {
    label: 'EcoScience Sponsorship',
    filename: 'Sponsorship copy/EcoScienceSolutionsInc_20180406_8-K_EX-10.1_11135398_EX-10.1_Sponsorship Agreement.pdf',
    icon: Award,
    category: 'Sponsorship',
    date: '2018',
    type: 'Science'
  },
  {
    label: 'FreezeTag Sponsorship',
    filename: 'Sponsorship copy/FreezeTagInc_20180411_8-K_EX-10.1_11139603_EX-10.1_Sponsorship Agreement.pdf',
    icon: Star,
    category: 'Sponsorship',
    date: '2018',
    type: 'Gaming'
  },
  
  // Strategic Alliance Agreements
  {
    label: 'Chipmos Tech Alliance',
    filename: 'Strategic Alliance copy/CHIPMOSTECHNOLOGIESBERMUDALTD_04_18_2016-EX-4.72-Strategic Alliance Agreement.PDF',
    icon: Handshake,
    category: 'Strategic Alliance',
    date: '2016',
    type: 'Technology'
  },
  {
    label: 'Energous Alliance',
    filename: 'Strategic Alliance copy/ENERGOUSCORP_03_16_2017-EX-10.24-STRATEGIC ALLIANCE AGREEMENT.PDF',
    icon: Handshake,
    category: 'Strategic Alliance',
    date: '2017',
    type: 'Energy'
  },
  {
    label: 'Moelis Alliance',
    filename: 'Strategic Alliance copy/MOELIS_CO_03_24_2014-EX-10.19-STRATEGIC ALLIANCE AGREEMENT.PDF',
    icon: Handshake,
    category: 'Strategic Alliance',
    date: '2014',
    type: 'Financial'
  },
  {
    label: 'Playa Resorts Alliance',
    filename: 'Strategic Alliance copy/PLAYAHOTELS_RESORTSNV_03_14_2017-EX-10.22-STRATEGIC ALLIANCE AGREEMENT (Hyatt Ziva Cancun).PDF',
    icon: Handshake,
    category: 'Strategic Alliance',
    date: '2017',
    type: 'Hospitality'
  },
  {
    label: 'Sibannac Alliance',
    filename: 'Strategic Alliance copy/SIBANNAC,INC_12_04_2017-EX-2.1-Strategic Alliance Agreement.PDF',
    icon: Handshake,
    category: 'Strategic Alliance',
    date: '2017',
    type: 'Cannabis'
  },
  
  // Supply Agreements
  {
    label: 'Agape Supply Agreement',
    filename: 'Supply copy/AgapeAtpCorp_20191202_10-KA_EX-10.1_11911128_EX-10.1_Supply Agreement.pdf',
    icon: Package,
    category: 'Supply',
    date: '2019',
    type: 'Nutrition'
  },
  {
    label: 'Loha Supply Agreement',
    filename: 'Supply copy/LohaCompanyltd_20191209_F-1_EX-10.16_11917878_EX-10.16_Supply Agreement.pdf',
    icon: Package,
    category: 'Supply',
    date: '2019',
    type: 'Manufacturing'
  },
  {
    label: 'Reynolds Supply Agreement',
    filename: 'Supply copy/ReynoldsConsumerProductsInc_20191115_S-1_EX-10.18_11896469_EX-10.18_Supply Agreement.pdf',
    icon: PackagePlus,
    category: 'Supply',
    date: '2019',
    type: 'Consumer Goods'
  },
  {
    label: 'West Pharma Supply',
    filename: 'Supply copy/WestPharmaceuticalServicesInc_20200116_8-K_EX-10.1_11947529_EX-10.1_Supply Agreement.pdf',
    icon: PackagePlus,
    category: 'Supply',
    date: '2020',
    type: 'Pharmaceutical'
  }
];

// Group contracts by category
const CONTRACT_CATEGORIES = ['All', ...new Set(SAMPLE_CONTRACTS.map(c => c.category))];

const UploadModal = ({ isOpen, onClose, onAnalysisComplete }: UploadModalProps) => {
  // ### State to manage the selected mode ('single' or 'batch')
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [singleFileProgress, setSingleFileProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [showAllSamples, setShowAllSamples] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const successfulUploads = useMemo(() => fileQueue.filter(f => f.status === 'success'), [fileQueue]);
  const failedUploads = useMemo(() => fileQueue.filter(f => f.status === 'error'), [fileQueue]);

  // ### --- BATCH MODE LOGIC --- ###

  const handleFilesSelectedForBatch = (files: FileList | null) => {
    if (!files) return;
    setGlobalError(null);
    const newItems: FileQueueItem[] = Array.from(files)
      .filter(file => {
        if (file.type !== 'application/pdf') { setGlobalError('Only PDF files are accepted.'); return false; }
        if (file.size > 16 * 1024 * 1024) { setGlobalError('Files must be smaller than 16MB.'); return false; }
        if (fileQueue.some(item => item.file.name === file.name)) { return false; }
        return true;
      })
      .map(file => ({ id: `${file.name}-${file.lastModified}`, file, status: 'pending', progress: 0 }));
    setFileQueue(prev => [...prev, ...newItems]);
  };

  const removeFileFromQueue = (id: string) => {
    if (isProcessing) return;
    setFileQueue(prev => prev.filter(item => item.id !== id));
  };
  
  const processFileInBatch = async (item: FileQueueItem): Promise<FileQueueItem> => {
      setFileQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'uploading', progress: 5 } : q));
      const formData = new FormData();
      formData.append('file', item.file);
      try {
        const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
        const apiUrl = `${apiBase}/analyze-contract`;
        const response = await fetch(apiUrl, { method: 'POST', body: formData });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
        }
        setFileQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'analyzing', progress: 75 } : q));
        const analysisData: ContractData = await response.json();
        analysisData.file_size = item.file.size; // Add file size
        await new Promise(resolve => setTimeout(resolve, 500));
        return { ...item, status: 'success', progress: 100, analysisData };
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
          return { ...item, status: 'error', progress: 0, error: errorMessage };
      }
  };

  const handleBatchProcess = async () => {
    const itemsToProcess = fileQueue.filter(item => item.status === 'pending');
    if (itemsToProcess.length === 0) return;
    setIsProcessing(true);
    setGlobalError(null);
    const results = await Promise.allSettled(itemsToProcess.map(processFileInBatch));
    const finalQueue = [...fileQueue];
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            const index = finalQueue.findIndex(item => item.id === result.value.id);
            if (index !== -1) finalQueue[index] = result.value;
        }
    });
    setFileQueue(finalQueue);
    setIsProcessing(false);

    const successfulData = finalQueue
      .filter(item => item.status === 'success' && item.analysisData)
      .map(item => item.analysisData!)
      .sort((a, b) => (a.file_size || 0) - (b.file_size || 0));

    if (successfulData.length > 0 && finalQueue.every(f => f.status === 'success' || f.status === 'error')) {
        setTimeout(() => {
            onAnalysisComplete(successfulData);
            handleClose();
        }, 1500);
    }
  };

  // ### --- SINGLE MODE LOGIC --- ###

  const handleSingleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf' || file.size > 16 * 1024 * 1024) {
      setGlobalError('Please upload a single PDF file smaller than 16MB.');
      return;
    }
    setIsProcessing(true);
    setGlobalError(null);
    setCurrentFile(file.name);
    setSingleFileProgress(0);
    try {
      const progressInterval = setInterval(() => setSingleFileProgress(p => Math.min(p + Math.random() * 15, 90)), 200);
      const formData = new FormData();
      formData.append('file', file);
      const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
      const apiUrl = `${apiBase}/analyze-contract`;
      const response = await fetch(apiUrl, { method: 'POST', body: formData });
      clearInterval(progressInterval);
      setSingleFileProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyse contract');
      }

      const analysisData: ContractData = await response.json();
      setTimeout(() => {
        onAnalysisComplete([analysisData]); // Pass result as an array
        handleClose();
      }, 1000);
      
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to analyse contract. Please try again.');
      setIsProcessing(false);
      setSingleFileProgress(0);
    }
  };


  const handleSampleClick = async (sample: typeof SAMPLE_CONTRACTS[0]) => {
      try {
        const res = await fetch(`/test_contracts/${sample.filename}`);
        if (!res.ok) throw new Error('Could not load sample PDF.');
        const blob = await res.blob();
        const file = new File([blob], sample.filename, { type: 'application/pdf' });
        
        if (mode === 'single') {
            await handleSingleFileUpload(file);
        } else {
            const fileList = new DataTransfer();
            fileList.items.add(file);
            handleFilesSelectedForBatch(fileList.files);
        }
    } catch (err) {
      setGlobalError('Failed to load sample contract.');
    }
  };
  
  const resetModal = () => {
    setFileQueue([]);
    setIsProcessing(false);
    setGlobalError(null);
    setIsDragOver(false);
    setSingleFileProgress(0);
    setCurrentFile(null);
    setMode('single'); // Default to single on next open
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
      setTimeout(resetModal, 300);
    }
  };

  const handleGoToDashboard = () => {
    const successfulData = fileQueue
      .filter(item => item.status === 'success' && item.analysisData)
      .map(item => item.analysisData!)
      .sort((a, b) => (a.file_size || 0) - (b.file_size || 0));

    if (successfulData.length > 0) {
      onAnalysisComplete(successfulData);
      handleClose();
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    if(mode === 'single') {
        if (event.dataTransfer.files.length > 0) handleSingleFileUpload(event.dataTransfer.files[0]);
    } else {
        handleFilesSelectedForBatch(event.dataTransfer.files);
    }
  };

  // Early return after all hooks are called
  if (!isOpen) return null;

  // ### --- RENDER LOGIC --- ###

  const renderSingleMode = () => (
    <>
      {!isProcessing ? (
        <div className="space-y-6" >
            <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragOver ? 'border-forest-500 bg-forest-50' : 'border-forest-300 hover:border-forest-400'}`}
                onDrop={handleDrop} onDragOver={(e) => {e.preventDefault(); setIsDragOver(true);}} onDragLeave={() => setIsDragOver(false)}
                
            >
                <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-editorial-medium text-gray-900 mb-2">Upload Your Contract</h3>
                <p className="text-gray-600 mb-4">Drag and drop your file here, or click to browse</p>
                <label className="inline-flex items-center space-x-2 px-6 py-3 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors cursor-pointer font-editorial-medium">
                  <Upload className="w-5 h-5" />
                  <span>Choose File</span>
                  <input type="file" accept=".pdf" onChange={(e) => e.target.files && handleSingleFileUpload(e.target.files[0])} className="hidden" />
                </label>
                <p className="text-xs text-gray-500 mt-4">PDF only, max 16MB</p>
            </div>
            {renderSampleContracts()}
        </div>
      ) : (
        <div className="space-y-6 pt-8 pb-8">
              <div className="flex items-center space-x-3 p-4 bg-sage-50 rounded-lg">
                <FileText className="w-8 h-8 text-forest-600" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-editorial-medium text-gray-900 truncate">{currentFile}</h4>
                  <p className="text-sm text-gray-600">{singleFileProgress === 100 ? 'Analysis complete!' : 'Analysing...'}</p>
                </div>
                {singleFileProgress === 100 ? <CheckCircle className="w-6 h-6 text-green-500" /> : <Loader2 className="w-6 h-6 text-forest-600 animate-spin" />}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{singleFileProgress === 100 ? 'Complete' : 'Processing...'}</span>
                  <span className="text-forest-600 font-editorial-medium">{Math.round(singleFileProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-forest-600 h-2 rounded-full transition-all" style={{ width: `${singleFileProgress}%` }}></div></div>
              </div>
        </div>
      )}
    </>
  );

  const renderBatchMode = () => (
    <>
      {fileQueue.length === 0 ? (
          <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all mt-4 ${isDragOver ? 'border-forest-500 bg-forest-50' : 'border-forest-300 hover:border-forest-400'}`}
              onDrop={handleDrop} onDragOver={(e) => {e.preventDefault(); setIsDragOver(true);}} onDragLeave={() => setIsDragOver(false)}
          >
              <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-editorial-medium text-gray-900 mb-2">Upload Multiple Contracts</h3>
              <p className="text-gray-600 mb-4">Drag and drop files here, or click to browse</p>
              <label className="inline-flex items-center space-x-2 px-6 py-3 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors cursor-pointer font-editorial-medium">
                  <Upload className="w-5 h-5" />
                  <span>Choose Files</span>
                  <input type="file" accept=".pdf" multiple onChange={(e) => handleFilesSelectedForBatch(e.target.files)} className="hidden" />
              </label>
              <p className="text-xs text-gray-500 mt-4">PDFs only, max 16MB each</p>
          </div>
      ) : (
          <div className="space-y-3 pr-2 max-h-[calc(90vh-350px)] overflow-y-auto mt-4">
              {fileQueue.map(item => (
                <div key={item.id} className="flex items-center space-x-4 p-3 bg-sage-50 rounded-lg">
                  <div className="flex-shrink-0">
                      {item.status === 'success' && <CheckCircle className="w-6 h-6 text-green-500" />}
                      {item.status === 'error' && <AlertCircle className="w-6 h-6 text-red-500" />}
                      {item.status === 'pending' && <FileIcon className="w-6 h-6 text-gray-500" />}
                      {(item.status === 'uploading' || item.status === 'analyzing') && <Loader2 className="w-6 h-6 text-forest-600 animate-spin" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-editorial-medium text-gray-800 truncate">{item.file.name}</p>
                    <div className="flex items-center space-x-2">
                      {item.status !== 'error' ? (
                        <>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className={`h-1.5 rounded-full transition-all ${item.status === 'success' ? 'bg-green-500' : 'bg-forest-600'}`} style={{ width: `${item.progress}%` }}/></div>
                          <span className="text-xs font-editorial-medium text-gray-500">{Math.round(item.progress)}%</span>
                        </>
                      ) : (<p className="text-xs text-red-600 truncate">{item.error}</p>)}
                    </div>
                  </div>
                  {!isProcessing && item.status !== 'success' && (
                      <button onClick={() => removeFileFromQueue(item.id)} className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
          </div>
      )}
      {renderSampleContracts()}
    </>
  );

  const filteredContracts = selectedCategory === 'All' 
    ? SAMPLE_CONTRACTS 
    : SAMPLE_CONTRACTS.filter(contract => contract.category === selectedCategory);
    
  const visibleContracts = showAllSamples ? filteredContracts : filteredContracts.slice(0, 6);
  const canShowMore = filteredContracts.length > 6 && !showAllSamples;

  const renderSampleContracts = () => (
    <div className="pt-6">
      <h3 className="text-md font-editorial-bold text-gray-800 mb-1 text-center">Try a sample contract</h3>
      <p className="text-gray-500 text-center mb-4 text-sm">Get started quickly with a template document.</p>
      
      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 px-4">
        {CONTRACT_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category);
              setShowAllSamples(false);
            }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              selectedCategory === category
                ? 'bg-forest-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Contract Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-2">
        {visibleContracts.map((sample) => (
          <button 
            key={sample.filename} 
            type="button" 
            onClick={() => handleSampleClick(sample)} 
            className="group relative flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 bg-white hover:bg-forest-50/50 hover:border-forest-300 transition-all duration-200 h-32 overflow-hidden"
          >
            <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-forest-100 text-forest-700">
              {sample.category}
            </div>
            <div className="p-3 mb-2 rounded-lg bg-forest-100/60 group-hover:bg-forest-100 transition-colors">
              <sample.icon className="w-5 h-5 text-forest-700" />
            </div>
            <span className="text-sm text-center font-editorial-medium text-gray-700 group-hover:text-forest-800">
              {sample.label}
            </span>
          </button>
        ))}
      </div>
      
      {/* Show More/Less Button */}
      {filteredContracts.length > 6 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAllSamples(!showAllSamples)}
            className="text-forest-600 hover:text-forest-800 text-sm font-medium flex items-center justify-center mx-auto gap-1.5"
          >
            {showAllSamples ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show {filteredContracts.length - 6} More Templates
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 font-editorial">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-forest-600 rounded-lg flex items-center justify-center"><FileUp className="w-6 h-6 text-white" /></div>
            <h2 className="text-xl font-editorial-bold text-gray-900">Upload Contract(s)</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleGoToDashboard}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-editorial-medium text-forest-600 hover:bg-forest-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Go to Homepage
            </button>
            <button onClick={handleClose} disabled={isProcessing} className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        </div>

        {/* ### NEW: Tab Navigation ### */}
        <div className="px-6 pt-4 border-b border-gray-200">
            <div className="flex space-x-1">
                <button onClick={() => setMode('single')} className={`px-4 py-2.5 rounded-t-lg font-editorial-medium text-sm transition-colors ${mode === 'single' ? 'bg-forest-50 border-x border-t border-gray-200 text-forest-700' : 'text-gray-500 hover:text-gray-800'}`}>Single Upload</button>
                <button onClick={() => setMode('batch')} className={`px-4 py-2.5 rounded-t-lg font-editorial-medium text-sm transition-colors ${mode === 'batch' ? 'bg-forest-50 border-x border-t border-gray-200 text-forest-700' : 'text-gray-500 hover:text-gray-800'}`}>Batch Upload</button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-grow p-6 overflow-y-auto bg-forest-50/30">
            {globalError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-sm text-red-700">{globalError}</p>
                </div>
            )}
            {mode === 'single' ? renderSingleMode() : renderBatchMode()}
        </div>

      {/* Footer for Batch Mode */}
      {mode === 'batch' && fileQueue.length > 0 && (
          <div className="flex-shrink-0 p-5 border-t border-gray-200 bg-white">
             <div className="flex items-center justify-between">
                <div>
                    <p className="font-editorial-medium text-gray-700">{fileQueue.length} file{fileQueue.length > 1 ? 's' : ''} in queue</p>
                    <div className="flex items-center space-x-3 text-xs">
                        {successfulUploads.length > 0 && <span className="text-green-600">{successfulUploads.length} successful</span>}
                        {failedUploads.length > 0 && <span className="text-red-600">{failedUploads.length} failed</span>}
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <label className="inline-flex items-center space-x-2 px-5 py-3 bg-white border-2 border-forest-600 text-forest-600 rounded-lg hover:bg-forest-50 transition-colors cursor-pointer font-editorial-bold disabled:opacity-50">
                        <Upload className="w-5 h-5" />
                        <span>Add More Files</span>
                        <input type="file" accept=".pdf" multiple onChange={(e) => handleFilesSelectedForBatch(e.target.files)} className="hidden" disabled={isProcessing} />
                    </label>
                    <button onClick={handleBatchProcess} disabled={isProcessing || fileQueue.every(f => f.status !== 'pending')} className="px-6 py-3 bg-forest-600 text-white rounded-lg hover:bg-forest-700 disabled:bg-gray-400 font-editorial-bold flex items-center space-x-2">
                        {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Processing...</span></> : <span>Analyze All</span>}
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadModal;
