// 📥 Modal pour importer des invités par CSV ou texte collé
import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, Check, Users } from 'lucide-react';
import { parseBulkGuests } from '../../utils/parseGuests';
import { MeetingParticipant } from '../../types/meetings';

interface ImportGuestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (guests: Omit<MeetingParticipant, 'id'>[]) => { added: number; ignored: number };
  existingParticipants: MeetingParticipant[];
  darkMode?: boolean;
}

export function ImportGuestsModal({ 
  isOpen, 
  onClose, 
  onImport, 
  existingParticipants,
  darkMode = false 
}: ImportGuestsModalProps) {
  const [input, setInput] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleInputChange = (value: string) => {
    setInput(value);
    setImportResult(null);
    
    if (value.trim()) {
      const result = parseBulkGuests(value, existingParticipants);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleInputChange(content);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parseResult?.valid?.length) return;

    const result = onImport(parseResult.valid);
    setImportResult(result);
    
    if (result.added > 0) {
      setTimeout(() => {
        onClose();
        setInput('');
        setParseResult(null);
        setImportResult(null);
      }, 2000);
    }
  };

  const handleClose = () => {
    onClose();
    setInput('');
    setParseResult(null);
    setImportResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Importer des invités</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          
          {/* Instructions */}
          <div className={`p-4 rounded-lg mb-6 ${
            darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
          }`}>
            <h3 className="font-medium mb-2 text-blue-600 dark:text-blue-400">
              Formats supportés :
            </h3>
            <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-300">
              <li>• <code>email@exemple.com</code></li>
              <li>• <code>Jean Dupont &lt;jean@exemple.com&gt;</code></li>
              <li>• <code>Marie Martin, marie@exemple.com</code></li>
              <li>• <code>Paul Durand paul@exemple.com</code></li>
            </ul>
          </div>

          {/* File upload */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                darkMode 
                  ? 'border-gray-600 hover:bg-gray-700' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Charger un fichier CSV/TXT</span>
            </button>
          </div>

          {/* Text input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Ou coller les emails (un par ligne) :
            </label>
            <textarea
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={`jean@exemple.com
Marie Dupont <marie@exemple.com>
Paul Martin, paul@exemple.com
alice@test.com`}
              rows={8}
              autoComplete="off"
              spellCheck="false"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>

          {/* Parse results */}
          {parseResult && (
            <div className="space-y-4 mb-6">
              
              {/* Valid entries */}
              {parseResult.valid.length > 0 && (
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {parseResult.valid.length} email{parseResult.valid.length > 1 ? 's' : ''} valide{parseResult.valid.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {parseResult.valid.slice(0, 5).map((guest: any) => (
                      <div key={guest.email || guest.name || Math.random()} className="text-sm text-green-700 dark:text-green-300">
                        {guest.name} ({guest.email})
                      </div>
                    ))}
                    {parseResult.valid.length > 5 && (
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        ... et {parseResult.valid.length - 5} autre{parseResult.valid.length - 5 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {parseResult.duplicates.length > 0 && (
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">
                      {parseResult.duplicates.length} doublon{parseResult.duplicates.length > 1 ? 's' : ''} ignoré{parseResult.duplicates.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    {parseResult.duplicates.join(', ')}
                  </div>
                </div>
              )}

              {/* Invalid entries */}
              {parseResult.invalid.length > 0 && (
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <X className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {parseResult.invalid.length} entrée{parseResult.invalid.length > 1 ? 's' : ''} invalide{parseResult.invalid.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {parseResult.invalid.join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className={`p-4 rounded-lg mb-4 ${
              darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="text-blue-800 dark:text-blue-300">
                ✅ {importResult.added} invité{importResult.added > 1 ? 's' : ''} ajouté{importResult.added > 1 ? 's' : ''}
                {importResult.ignored > 0 && (
                  <span className="text-yellow-600">
                    {' '}• {importResult.ignored} ignoré{importResult.ignored > 1 ? 's' : ''} (limite 20)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Limite: 20 participants maximum
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleImport}
              disabled={!parseResult?.valid?.length}
              className={`px-4 py-2 rounded-lg transition-colors ${
                parseResult?.valid?.length
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Importer {parseResult?.valid?.length || 0} invité{parseResult?.valid?.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}