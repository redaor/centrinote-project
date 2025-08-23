import React, { useState } from 'react';
import {
  Download,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Shield,
  X,
  Loader
} from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { supabase } from '../../../lib/supabase';
import { accountService } from '../../../services/accountService';

interface DataPrivacySectionProps {
  darkMode: boolean;
}

export function DataPrivacySection({ darkMode }: DataPrivacySectionProps) {
  const { state, dispatch } = useApp();
  const { user, documents, vocabulary, studySessions } = state;
  
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [edgeFunctionStatus, setEdgeFunctionStatus] = useState<{ available: boolean; checked: boolean }>({ 
    available: false, 
    checked: false 
  });

  // Vérifier la disponibilité de l'Edge Function au montage
  React.useEffect(() => {
    const checkEdgeFunction = async () => {
      const status = await accountService.checkEdgeFunctionAvailability();
      setEdgeFunctionStatus({ available: status.available, checked: true });
    };
    checkEdgeFunction();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Fonction d'export
  const handleExportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    
    try {
      const exportData = {
        user: { id: user?.id, name: user?.name, email: user?.email },
        documents: documents.map(doc => ({
          id: doc.id, title: doc.title, content: doc.content, type: doc.type,
          createdAt: doc.createdAt.toISOString(), tags: doc.tags, folder: doc.folder
        })),
        vocabulary: vocabulary.map(entry => ({
          id: entry.id, word: entry.word, definition: entry.definition,
          category: entry.category, difficulty: entry.difficulty, mastery: entry.mastery
        })),
        studySessions: studySessions.map(session => ({
          id: session.id, title: session.title, type: session.type,
          scheduledFor: session.scheduledFor.toISOString(), completed: session.completed
        })),
        exportDate: new Date().toISOString()
      };

      await new Promise(resolve => setTimeout(resolve, 1000));

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `centrinote-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showMessage('success', 'Export terminé');
      
    } catch (error) {
      showMessage('error', 'Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  // Fonction d'import
  const handleImportData = () => {
    if (isImporting) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!importData.documents && !importData.vocabulary) {
          throw new Error('Fichier invalide');
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let imported = 0;
        if (importData.documents) {
          importData.documents.forEach((doc: any) => {
            if (!documents.find(existing => existing.id === doc.id)) {
              dispatch({ type: 'ADD_DOCUMENT', payload: { ...doc, createdAt: new Date(doc.createdAt), updatedAt: new Date() } });
              imported++;
            }
          });
        }

        showMessage('success', `${imported} éléments importés`);
        
      } catch (error) {
        showMessage('error', 'Erreur lors de l\'import');
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  };

  // Fonction de suppression de compte
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      showMessage('error', 'Tapez "SUPPRIMER" pour confirmer');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const result = await accountService.deleteAccountComplete(deleteConfirmation);
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }

      dispatch({ type: 'SET_USER', payload: null });
      showMessage('success', 'Compte supprimé');
      
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Erreur lors de la suppression');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
    }
  };

  const totalItems = documents.length + vocabulary.length + studySessions.length;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header épuré */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h2 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Vos données
        </h2>
      </div>

      {/* Message de notification */}
      {message && (
        <div className={`
          p-4 rounded-xl border flex items-center space-x-3 animate-fade-in
          ${message.type === 'success' 
            ? darkMode 
              ? 'bg-green-900/20 border-green-800 text-green-400' 
              : 'bg-green-50 border-green-200 text-green-800'
            : darkMode 
              ? 'bg-red-900/20 border-red-800 text-red-400' 
              : 'bg-red-50 border-red-200 text-red-800'
          }
        `}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Actions principales */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-2xl p-8 space-y-8
      `}>
        {/* Statistiques */}
        <div className="text-center">
          <div className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {totalItems}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            éléments • {documents.length} docs • {vocabulary.length} mots
          </div>
        </div>

        {/* Actions sur une ligne */}
        <div className="flex gap-4">
          {/* Export */}
          <button
            onClick={handleExportData}
            disabled={isExporting || totalItems === 0}
            className={`
              flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl transition-all duration-200
              ${isExporting || totalItems === 0
                ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600'
              }
            `}
          >
            {isExporting ? (
              <Loader className="w-5 h-5 text-gray-500 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
            <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              Exporter
            </span>
          </button>

          {/* Import */}
          <button
            onClick={handleImportData}
            disabled={isImporting}
            className={`
              flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl transition-all duration-200
              ${isImporting
                ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-800/50 border-2 border-teal-200 dark:border-teal-700 hover:border-teal-300 dark:hover:border-teal-600'
              }
            `}
          >
            {isImporting ? (
              <Loader className="w-5 h-5 text-gray-500 animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            )}
            <span className={`font-medium ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>
              Importer
            </span>
          </button>
        </div>

        {/* Séparateur */}
        <div className="relative">
          <div className={`absolute inset-0 flex items-center`}>
            <div className={`w-full border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} />
          </div>
          <div className="relative flex justify-center text-xs font-medium">
            <span className={`px-4 ${darkMode ? 'bg-gray-800 text-gray-500' : 'bg-white text-gray-400'}`}>
              ZONE DANGEREUSE
            </span>
          </div>
        </div>

        {/* Suppression */}
        <div className="text-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeletingAccount || !edgeFunctionStatus.available}
            className={`
              flex items-center justify-center space-x-3 px-8 py-4 rounded-xl transition-all duration-200
              ${isDeletingAccount || !edgeFunctionStatus.available
                ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50'
                : 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/50 border-2 border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600'
              }
            `}
          >
            {isDeletingAccount ? (
              <Loader className="w-5 h-5 text-gray-500 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
              Supprimer mon compte
            </span>
          </button>
          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Suppression définitive et irréversible
          </p>
        </div>
      </div>

      {/* Modal de suppression */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowDeleteModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl p-8 w-96 max-w-[90vw]
          `}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Supprimer le compte ?
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                La suppression efface tout et bloque la reconnexion.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tapez <span className="font-bold text-red-600">"SUPPRIMER"</span> pour confirmer :
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="SUPPRIMER"
                  className={`
                    w-full px-4 py-3 rounded-xl border transition-colors text-center font-mono
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-red-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-red-500/20
                  `}
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  className={`
                    flex-1 px-4 py-3 rounded-xl font-medium transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'SUPPRIMER' || isDeletingAccount}
                  className={`
                    flex-1 px-4 py-3 rounded-xl font-medium transition-colors
                    ${deleteConfirmation === 'SUPPRIMER' && !isDeletingAccount
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }
                  `}
                >
                  {isDeletingAccount ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Suppression...</span>
                    </div>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}