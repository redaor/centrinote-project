import React, { useState, useEffect } from 'react';
import { Search, Grid, List, Plus, Eye, Download, Share2, Trash2, StickyNote as StickyNoteIcon, Upload, File } from 'lucide-react';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
import { DocumentNotes } from './DocumentNotes';

interface Document {
  id: string;
  title: string;
  size: string;
  tags: string[];
  date: string;
  type: string;
  url?: string;
}

const DocumentManager: React.FC = () => {
  console.log('🔄 DocumentManager component rendering...');
  
  const { user } = useSupabaseAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState('Tous les dossiers');
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [newDocument, setNewDocument] = useState({
    title: '',
    type: 'pdf',
    tags: ''
  });

  // Sample documents data
  useEffect(() => {
    const sampleDocuments: Document[] = [
      {
        id: 'doc-1',
        title: 'Introduction to Machine Learning',
        size: '1.95 MB',
        tags: ['AI', 'Machine Learning'],
        date: '20/01/2024',
        type: 'pdf'
      },
      {
        id: 'doc-2',
        title: 'Project Meeting Notes',
        size: '14.65 KB',
        tags: ['Meeting', 'Project'],
        date: '18/01/2024',
        type: 'docx'
      }
    ];
    setDocuments(sampleDocuments);
    console.log(`✅ ${new Date().toISOString()} - Loaded ${sampleDocuments.length} documents`);
  }, []);

  const handleOpenNotes = (document: Document) => {
    console.log(`📝 ${new Date().toISOString()} - Opening notes for document:`, document.id, document.title);
    setSelectedDocument(document);
    setIsNotesModalOpen(true);
  };

  const handleCloseNotes = () => {
    console.log(`❌ ${new Date().toISOString()} - Closing notes modal`);
    setIsNotesModalOpen(false);
    setSelectedDocument(null);
  };

  const handleOpenAddDocumentModal = () => {
    console.log('📄 Ouverture de la modale d\'ajout de document');
    setIsAddDocumentModalOpen(true);
  };

  const handleCloseAddDocumentModal = () => {
    console.log('❌ Fermeture de la modale d\'ajout de document');
    setIsAddDocumentModalOpen(false);
    setNewDocument({
      title: '',
      type: 'pdf',
      tags: ''
    });
  };

  const handleAddDocument = () => {
    if (!newDocument.title.trim()) {
      alert('Le titre du document est obligatoire');
      return;
    }

    const tagsArray = newDocument.tags
      ? newDocument.tags.split(',').map(tag => tag.trim())
      : [];

    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: newDocument.title.trim(),
      size: '0 KB',
      tags: tagsArray,
      date: new Date().toLocaleDateString('fr-FR'),
      type: newDocument.type
    };

    setDocuments([...documents, newDoc]);
    handleCloseAddDocumentModal();
    console.log('✅ Document ajouté:', newDoc);
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const DocumentCard: React.FC<{ document: Document }> = ({ document }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center mb-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
          <span className="text-blue-600 dark:text-blue-400 font-semibold">
            {document.type.toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {document.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{document.size}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {document.tags.map((tag, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
        <span>{document.date}</span>
      </div>
      
      <div className="flex items-center justify-between" style={{ display: 'flex' }}>
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenNotes(document)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
            title="Notes"
          >
            <StickyNoteIcon className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Eye className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>
        <div className="flex space-x-2">
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const DocumentRow: React.FC<{ document: Document }> = ({ document }) => (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center mr-3">
            <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">
              {document.type.toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{document.title}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{document.size}</span>
              <span>{document.date}</span>
              <div className="flex space-x-1">
                {document.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2" style={{ display: 'flex' }}>
          <button
            onClick={() => handleOpenNotes(document)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
            title="Notes"
          >
            <StickyNoteIcon className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Eye className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Download className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes Documents</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenue, {user?.email || 'utilisateur'}
          </p>
        </div>
        <button 
          onClick={handleOpenAddDocumentModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Ajouter un document</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher des documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option>Tous les dossiers</option>
            <option>Documents récents</option>
            <option>Favoris</option>
          </select>
          
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Aucun document trouvé</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredDocuments.map((document) =>
            viewMode === 'grid' ? (
              <DocumentCard key={document.id} document={document} />
            ) : (
              <DocumentRow key={document.id} document={document} />
            )
          )}
        </div>
      )}

      {/* Notes Modal */}
      {isNotesModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Notes - {selectedDocument.title}
                </h2>
                <button
                  onClick={handleCloseNotes}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Fermer</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <DocumentNotes documentId={selectedDocument.id} />
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleCloseNotes}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajout de document */}
      {isAddDocumentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Ajouter un document
                </h2>
                <button
                  onClick={handleCloseAddDocumentModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Fermer</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titre du document *
                  </label>
                  <input
                    type="text"
                    value={newDocument.title}
                    onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Entrez le titre du document"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Type de document
                  </label>
                  <select
                    value={newDocument.type}
                    onChange={(e) => setNewDocument({...newDocument, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                    <option value="txt">TXT</option>
                    <option value="md">Markdown</option>
                    <option value="ppt">Présentation</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    value={newDocument.tags}
                    onChange={(e) => setNewDocument({...newDocument, tags: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Ex: AI, Machine Learning, Project"
                  />
                </div>
                
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Glissez-déposez un fichier ici ou
                    </p>
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                      Parcourir les fichiers
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Formats supportés: PDF, DOCX, TXT, MD, PPT
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={handleCloseAddDocumentModal}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors mr-2"
              >
                Annuler
              </button>
              <button
                onClick={handleAddDocument}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;