import { useState } from 'react';
import ScanPage from './pages/ScanPage';
import SelectPage from './pages/SelectPage';
import ConfigPage from './pages/ConfigPage';
import MigrationPage from './pages/MigrationPage';

type Step = 'scan' | 'select' | 'config' | 'migration';

function App() {
  const [step, setStep] = useState<Step>('scan');
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string>('');

  const handleFoldersSelected = (folders: string[]) => {
    setSelectedFolders(folders);
    setStep('config');
  };

  const handleMigrationStarted = (id: string) => {
    setTaskId(id);
    setStep('migration');
  };

  const handleBackToScan = () => {
    setStep('scan');
    setSelectedFolders([]);
    setTaskId('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            STOZ - Synology To ZimaOS Migration
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="mb-6">
          <div className="flex items-center">
            <div className={`flex-1 ${step === 'scan' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              1. Scan
            </div>
            <div className={`flex-1 ${step === 'select' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              2. Select
            </div>
            <div className={`flex-1 ${step === 'config' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              3. Configure
            </div>
            <div className={`flex-1 ${step === 'migration' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
              4. Migrate
            </div>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: step === 'scan' ? '25%' : step === 'select' ? '50%' : step === 'config' ? '75%' : '100%'
              }}
            />
          </div>
        </div>

        {step === 'scan' && <ScanPage onNext={() => setStep('select')} />}
        {step === 'select' && (
          <SelectPage
            onNext={handleFoldersSelected}
            onBack={() => setStep('scan')}
          />
        )}
        {step === 'config' && (
          <ConfigPage
            selectedFolders={selectedFolders}
            onNext={handleMigrationStarted}
            onBack={() => setStep('select')}
          />
        )}
        {step === 'migration' && (
          <MigrationPage
            taskId={taskId}
            onBack={handleBackToScan}
          />
        )}
      </main>
    </div>
  );
}

export default App;
