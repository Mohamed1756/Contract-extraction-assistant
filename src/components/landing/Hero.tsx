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
              <div className="mt-8">
                <a 
                  href="https://github.com/Qleric-labs/contract-extraction-assistant" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 transition-colors duration-200 transform hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 7.07c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  Star us on GitHub
                </a>
                <p className="mt-3 text-sm text-gray-500">Support our open-source project with a star! ⭐</p>
              </div>
            </div>

            {/* API Setup Info */}
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Demo Mode Notice */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-md text-left">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Demo Mode Active</h3>
                    <div className="mt-2 text-sm text-blue-700 space-y-2">
                      <p>You're currently using a shared demo API key. For testing purposes only.</p>
                      <p className="font-medium">🔒 Security Notice:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Do <span className="font-semibold">not</span> upload sensitive or confidential documents</li>
                        <li>Documents processed with the demo key may be used for model training</li>
                        <li>For production use, please provide your own API key</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Setup Instructions */}
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md text-left">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Using Your Own API Key</h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>1. Sign up at <a href="https://mistral.ai" target="_blank" rel="noopener noreferrer" className="font-medium underline">Mistral AI</a></p>
                      <p>2. Choose a plan that meets your needs (free tier available)</p>
                      <p>3. Add your API key to a <code className="bg-amber-100 px-1 rounded">.env</code> file:</p>
                      <pre className="mt-2 p-2 bg-amber-100 rounded text-xs overflow-x-auto">MISTRAL_API_KEY=your_api_key_here</pre>
                      <p className="mt-2 text-xs font-medium">⚠️ Create this file <span className="underline">before</span> running <code className="bg-amber-100 px-1 rounded">docker compose up</code></p>
                    </div>
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