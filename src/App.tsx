import React, { useState } from 'react';
import Hero from './components/landing/Hero';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';

import type { ContractData } from './components/Dashboard';

// Simplified App component: Landing -> Upload -> Dashboard flow
const App = () => {
  // State to control which view is shown: 'hero' or 'dashboard'
  const [view, setView] = useState<'hero' | 'dashboard'>('hero');
  
  // State to hold the contract data for the analysis view
  const [activeContracts, setActiveContracts] = useState<ContractData[] | null>(null);
  
  // State to control the upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  /**
   * Called when the UploadModal successfully analyzes a contract.
   */
  const handleAnalysisComplete = (data: ContractData[]) => {
    setIsUploadModalOpen(false);
    setActiveContracts(data);
    setView('dashboard');
  };

  /**
   * Navigate back to the landing page.
   */
  const handleBackToLanding = () => {
    setView('hero');
    setActiveContracts(null);
  };

  return (
    <div>
      {view === 'hero' ? (
        <Hero onUploadClick={() => setIsUploadModalOpen(true)} />
      ) : (
        <Dashboard 
          initialContracts={activeContracts}
          onBack={handleBackToLanding}
        />
      )}
      
      {/* Upload modal for the Hero page */}
      <UploadModal 
        isOpen={isUploadModalOpen && view === 'hero'}
        onClose={() => setIsUploadModalOpen(false)}
        onAnalysisComplete={handleAnalysisComplete}
      />
    </div>
  );
};

export default App;