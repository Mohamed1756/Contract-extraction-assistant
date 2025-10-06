import { Upload } from 'lucide-react';

const Hero = ({ onUploadClick }: { onUploadClick: () => void }) => {
  return (
    <section
      className="relative overflow-hidden font-editorial min-h-screen flex items-center"
      style={{ backgroundColor: '#FCFCF9' }}
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Premium Background Lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="line1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="20%" stopColor="rgba(0,0,0,0.05)" />
              <stop offset="50%" stopColor="rgba(0,0,0,0)" />
              <stop offset="80%" stopColor="rgba(0,0,0,0.05)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>
            <linearGradient id="line2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="30%" stopColor="rgba(0,0,0,0.04)" />
              <stop offset="50%" stopColor="rgba(0,0,0,0)" />
              <stop offset="70%" stopColor="rgba(0,0,0,0.04)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>
            <linearGradient id="line3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="25%" stopColor="rgba(0,0,0,0.045)" />
              <stop offset="50%" stopColor="rgba(0,0,0,0)" />
              <stop offset="75%" stopColor="rgba(0,0,0,0.045)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>
          </defs>
          
          {/* Diagonal lines with fade effect */}
          <line x1="0" y1="150" x2="1200" y2="200" stroke="url(#line1)" strokeWidth="1" transform="rotate(15 600 400)" />
          <line x1="0" y1="300" x2="1200" y2="350" stroke="url(#line2)" strokeWidth="1" transform="rotate(-8 600 400)" />
          <line x1="0" y1="450" x2="1200" y2="500" stroke="url(#line3)" strokeWidth="1" transform="rotate(12 600 400)" />
          <line x1="0" y1="600" x2="1200" y2="650" stroke="url(#line1)" strokeWidth="1" transform="rotate(-5 600 400)" />
          
          {/* Horizontal lines */}
          <line x1="0" y1="100" x2="1200" y2="100" stroke="url(#line2)" strokeWidth="1" />
          <line x1="0" y1="700" x2="1200" y2="700" stroke="url(#line3)" strokeWidth="1" />
          
          {/* Curved wing lines */}
          <path d="M 1000 100 Q 1300 400 1000 700" stroke="url(#line1)" strokeWidth="1" fill="none" />
          <path d="M 200 100 Q -100 400 200 700" stroke="url(#line2)" strokeWidth="1" fill="none" />
          <path d="M 1050 150 Q 1350 400 1050 650" stroke="url(#line3)" strokeWidth="1" fill="none" />
          <path d="M 150 150 Q -150 400 150 650" stroke="url(#line1)" strokeWidth="1" fill="none" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 w-full">
        <div className="grid lg:grid-cols-1 gap-16 items-center text-center">
          {/* Centered Content */}
          <div className="space-y-10">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-editorial-bold text-gray-900 leading-tight tracking-tighter">
                Contract <br />Analysis, <span className="text-forest-600">Simplified</span>.
              </h1>
              <p className="text-lg sm:text-lg text-gray-600 leading-relaxed font-editorial-light max-w-xl mx-auto">
                Open-source tooling for anyone who needs contract dates and renewal terms without leaving their own stack.
                Run it locally, keep control of the documents.
              </p>
            </div>

            {/* API Setup Info */}
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md max-w-2xl mx-auto mb-8 text-left">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Getting Started with Mistral AI</h3>
                  <div className="mt-2 text-sm text-amber-700">
                    <p>1. Sign up at <a href="https://mistral.ai" target="_blank" rel="noopener noreferrer" className="font-medium underline">Mistral AI</a></p>
                    <p>2. Choose the free "Experiment" plan (data may be used for training) or a paid plan for production use</p>
                    <p>3. Create your API key and add it to a <code className="bg-amber-100 px-1 rounded">.env</code> file in the project root:</p>
                    <pre className="mt-2 p-2 bg-amber-100 rounded text-xs overflow-x-auto">MISTRAL_API_KEY=your_api_key_here</pre>
                    <p className="mt-2 text-xs font-medium">⚠️ Important: Create this file <span className="underline">before</span> running <code className="bg-amber-100 px-1 rounded">docker compose up</code>, otherwise the system will fall back to regex-only mode.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center">
              <button
                onClick={onUploadClick}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-editorial-medium text-white bg-forest-600 rounded-full shadow-lg hover:bg-forest-700 hover:shadow-xl transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-forest-300 focus:ring-opacity-75"
              >
                <div className="absolute inset-[-8px] rounded-full border-2 border-gray-200 opacity-40"></div>
                <div className="absolute inset-[-16px] rounded-full border-2 border-gray-200 opacity-20"></div>
                <div className="absolute inset-[-24px] rounded-full border-2 border-gray-200 opacity-10"></div>
                <Upload className="w-5 h-5 mr-3 transition-transform duration-300 ease-in-out group-hover:rotate-[-5deg]" />
                <span className="transition-transform duration-300 ease-in-out group-hover:scale-105 "> Upload Contract</span>
              </button>
            </div>
          </div>
        </div>

  
          </div>

      {/* Animation Styles */}
      <style >{`
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
        .animate-spin {
          animation: spin 4s linear infinite;
        }
        .animate-spin-fast {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;