import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Star,
  Volume2,
  Edit,
  Trash2,
  Eye,
  RotateCcw,
  Brain,
  TrendingUp,
  X,
  Save,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { VocabularyEntry } from '../../types';
import { useVocabulary } from '../../hooks/useVocabulary';
import { DatabaseErrorMessage } from '../common/DatabaseErrorMessage';

type SortOption = 'alphabetical' | 'category' | 'mastery-asc' | 'mastery-desc' | 'difficulty-asc' | 'difficulty-desc' | 'recent';

export function VocabularyNotebook() {
  const { state, dispatch } = useApp();
  const { darkMode, user } = state;
  const { vocabulary, loading: vocabularyLoading, error: vocabularyError, addVocabularyEntry, updateVocabularyEntry, deleteVocabularyEntry } = useVocabulary();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list' | 'flashcards'>('cards');
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // État pour le tri
  const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
  
  // État pour le filtre alphabétique
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  // États pour les modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<VocabularyEntry | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // États pour le formulaire
  const [formData, setFormData] = useState({
    word: '',
    definition: '',
    category: 'General',
    example: '',
    mastery: 0,
    difficulty: 1 as 1 | 2 | 3 | 4 | 5
  });

  const categories = [...new Set(vocabulary.map(entry => entry.category))];
  
  // Générer l'alphabet A-Z
  const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

  // Fonction de tri
  const sortVocabulary = (entries: VocabularyEntry[], sortOption: SortOption): VocabularyEntry[] => {
    const sortedEntries = [...entries];
    
    switch (sortOption) {
      case 'alphabetical':
        return sortedEntries.sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));
      
      case 'category':
        return sortedEntries.sort((a, b) => {
          // D'abord trier par catégorie, puis par ordre alphabétique dans chaque catégorie
          const categoryCompare = a.category.localeCompare(b.category);
          if (categoryCompare !== 0) return categoryCompare;
          return a.word.toLowerCase().localeCompare(b.word.toLowerCase());
        });
      
      case 'mastery-desc':
        return sortedEntries.sort((a, b) => b.mastery - a.mastery);
      
      case 'mastery-asc':
        return sortedEntries.sort((a, b) => a.mastery - b.mastery);
      
      case 'difficulty-desc':
        return sortedEntries.sort((a, b) => b.difficulty - a.difficulty);
      
      case 'difficulty-asc':
        return sortedEntries.sort((a, b) => a.difficulty - b.difficulty);
      
      case 'recent':
        return sortedEntries.sort((a, b) => {
          const dateA = a.lastReviewed || new Date(0);
          const dateB = b.lastReviewed || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      
      default:
        return sortedEntries;
    }
  };

  // Filtrer et trier le vocabulaire
  const filteredAndSortedVocabulary = (() => {
    // D'abord filtrer
    const filtered = vocabulary.filter(entry => {
      const matchesSearch = entry.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.definition.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || entry.category === selectedCategory;
      const matchesLetter = !selectedLetter || entry.word.toLowerCase().startsWith(selectedLetter.toLowerCase());
      return matchesSearch && matchesCategory && matchesLetter;
    });
    
    // Puis trier
    return sortVocabulary(filtered, sortBy);
  })();

  // Compter les mots par lettre pour afficher les compteurs
  const getWordCountForLetter = (letter: string) => {
    return vocabulary.filter(entry => 
      entry.word.toLowerCase().startsWith(letter.toLowerCase()) &&
      (!selectedCategory || entry.category === selectedCategory) &&
      (entry.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
       entry.definition.toLowerCase().includes(searchTerm.toLowerCase()))
    ).length;
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return 'from-green-500 to-green-600';
    if (mastery >= 60) return 'from-yellow-500 to-yellow-600';
    if (mastery >= 40) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < difficulty 
            ? 'text-yellow-400 fill-current' 
            : darkMode ? 'text-gray-600' : 'text-gray-300'
        }`}
      />
    ));
  };

  const resetForm = () => {
    setFormData({
      word: '',
      definition: '',
      category: 'General',
      example: '',
      mastery: 0,
      difficulty: 1
    });
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddWord = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleEditWord = (entry: VocabularyEntry) => {
    setSelectedEntry(entry);
    setFormData({
      word: entry.word,
      definition: entry.definition,
      category: entry.category,
      example: entry.examples[0] || '',
      mastery: entry.mastery,
      difficulty: entry.difficulty
    });
    setShowEditModal(true);
  };

  const handleDeleteWord = (entry: VocabularyEntry) => {
    setSelectedEntry(entry);
    setShowDeleteModal(true);
  };

  const handleSaveWord = () => {
    if (!formData.word.trim() || !formData.definition.trim()) {
      showMessage("Le mot et la définition sont obligatoires !");
      return;
    }

    console.log("🔄 handleSaveWord appelé avec:", {
      word: formData.word,
      definition: formData.definition,
      category: formData.category,
      userId: user?.id,
      isEditing: showEditModal
    });
    if (showEditModal && selectedEntry) {
      console.log("📝 Mode édition - mise à jour du mot:", selectedEntry.id);
      // Édition - Utiliser le service Supabase
      const updatedEntry: VocabularyEntry = {
        ...selectedEntry,
        word: formData.word.trim(),
        definition: formData.definition.trim(),
        category: formData.category,
        examples: formData.example.trim() ? [formData.example.trim()] : [],
        mastery: formData.mastery,
        difficulty: formData.difficulty
      };
      
      updateVocabularyEntry(updatedEntry)
        .then(success => {
          if (success) {
            console.log("✅ Mot mis à jour avec succès");
            showMessage("Mot mis à jour avec succès !");
            setShowEditModal(false);
          } else {
            console.error("❌ Échec de la mise à jour");
            showMessage("Erreur lors de la mise à jour du mot");
          }
        });
    } else {
      console.log("📝 Mode création - ajout d'un nouveau mot");
      // Ajout - Utiliser le service Supabase
      const newWord = {
        word: formData.word.trim(),
        definition: formData.definition.trim(),
        category: formData.category,
        examples: formData.example.trim() ? [formData.example.trim()] : [],
        difficulty: formData.difficulty,
        mastery: formData.mastery,
        timesReviewed: 0
      };
      
      console.log("📤 Données du nouveau mot:", newWord);
      
      addVocabularyEntry(newWord)
        .then(entry => {
          if (entry) {
            console.log("✅ Mot ajouté avec succès:", entry);
            showMessage("Mot ajouté avec succès !");
            setShowAddModal(false);
          } else {
            console.error("❌ addVocabularyEntry a retourné null");
            showMessage("Erreur lors de l'ajout du mot");
          }
        });
    }
    
    resetForm();
    setSelectedEntry(null);
  };

  const confirmDeleteWord = () => {
    if (selectedEntry) {
      deleteVocabularyEntry(selectedEntry.id)
        .then(success => {
          if (success) {
            showMessage("Mot supprimé avec succès !");
            setShowDeleteModal(false);
            setSelectedEntry(null);
          } else {
            showMessage("Erreur lors de la suppression du mot");
          }
        });
    }
  };

  const nextFlashcard = () => {
    setShowAnswer(false);
    setCurrentFlashcard((prev) => (prev + 1) % filteredAndSortedVocabulary.length);
  };

  const previousFlashcard = () => {
    setShowAnswer(false);
    setCurrentFlashcard((prev) => (prev - 1 + filteredAndSortedVocabulary.length) % filteredAndSortedVocabulary.length);
  };

  const getSortIcon = (option: SortOption) => {
    if (sortBy !== option) return <ArrowUpDown className="w-4 h-4" />;
    
    switch (option) {
      case 'mastery-desc':
      case 'difficulty-desc':
        return <ArrowDown className="w-4 h-4" />;
      case 'mastery-asc':
      case 'difficulty-asc':
        return <ArrowUp className="w-4 h-4" />;
      default:
        return <ArrowUpDown className="w-4 h-4" />;
    }
  };

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'alphabetical':
        return 'Alphabétique (A-Z)';
      case 'category':
        return 'Par catégorie';
      case 'mastery-desc':
        return 'Maîtrise (élevée → faible)';
      case 'mastery-asc':
        return 'Maîtrise (faible → élevée)';
      case 'difficulty-desc':
        return 'Difficulté (élevée → faible)';
      case 'difficulty-asc':
        return 'Difficulté (faible → élevée)';
      case 'recent':
        return 'Récemment révisé';
      default:
        return 'Alphabétique (A-Z)';
    }
  };

  const VocabularyCard = ({ entry }: { entry: VocabularyEntry }) => (
    <div className={`
      ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
      border rounded-lg p-4 hover:shadow-md transition-all duration-200
      cursor-pointer group
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className={`text-lg font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`} title={entry.word}>
                {entry.word}
              </h3>
              <button className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''} flex-shrink-0`}>
                <Volume2 className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>
            <p className={`text-sm mb-2 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {entry.definition}
            </p>
            <div className="flex items-center space-x-3 text-xs">
              <span className={`px-2 py-1 rounded-full truncate ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`} title={entry.category}>
                {entry.category}
              </span>
              <div className="flex items-center space-x-1 flex-shrink-0">
                {getDifficultyStars(entry.difficulty)}
              </div>
            </div>
          </div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 flex-shrink-0">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleEditWord(entry);
            }}
            className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
            title="Éditer"
          >
            <Edit className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteWord(entry);
            }}
            className={`p-1 rounded hover:bg-red-100 ${darkMode ? 'hover:bg-red-900/20' : ''}`}
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Maîtrise</span>
          <span className={darkMode ? 'text-white' : 'text-gray-900'}>{entry.mastery}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full bg-gradient-to-r ${getMasteryColor(entry.mastery)}`}
            style={{ width: `${entry.mastery}%` }}
          ></div>
        </div>
      </div>

      {entry.examples.length > 0 && (
        <div className="text-xs mb-3">
          <p className={`font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Exemple:
          </p>
          <p className={`italic line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            "{entry.examples[0]}"
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mt-3 text-xs">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
          Révisé {entry.timesReviewed} fois
        </span>
        {entry.lastReviewed && (
          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
            Dernière: {entry.lastReviewed.toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );

  const FlashcardView = () => {
    if (filteredAndSortedVocabulary.length === 0) return null;
    
    const currentEntry = filteredAndSortedVocabulary[currentFlashcard];
    
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className={`
          w-full max-w-2xl h-80 rounded-2xl shadow-lg cursor-pointer
          transform transition-all duration-500 hover:scale-105
          ${darkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'}
          border-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}
        `} onClick={() => setShowAnswer(!showAnswer)}>
          <div className="h-full flex flex-col justify-center items-center p-8 text-center">
            {!showAnswer ? (
              <>
                <h2 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {currentEntry.word}
                </h2>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                    {currentEntry.category}
                  </span>
                  <div className="flex items-center space-x-1">
                    {getDifficultyStars(currentEntry.difficulty)}
                  </div>
                </div>
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Cliquez pour révéler la définition
                </p>
              </>
            ) : (
              <>
                <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {currentEntry.word}
                </h2>
                <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {currentEntry.definition}
                </p>
                {currentEntry.examples.length > 0 && (
                  <div className="mb-4">
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Exemple:
                    </p>
                    <p className={`text-sm italic ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      "{currentEntry.examples[0]}"
                    </p>
                  </div>
                )}
                <div className="flex justify-center space-x-4 mt-6">
                  <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                    Difficile
                  </button>
                  <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
                    Moyen
                  </button>
                  <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                    Facile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between w-full max-w-2xl mt-6">
          <button
            onClick={previousFlashcard}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              darkMode 
                ? 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
                : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Précédent
          </button>
          
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {currentFlashcard + 1} sur {filteredAndSortedVocabulary.length}
          </span>
          
          <button
            onClick={nextFlashcard}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200"
          >
            Suivant
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg
          ${darkMode ? 'bg-green-800 text-green-200' : 'bg-green-100 text-green-800'}
          border ${darkMode ? 'border-green-700' : 'border-green-200'}
        `}>
          {message}
        </div>
      )}

      {/* Gestion des erreurs de base de données */}
      {vocabularyError && !vocabularyLoading && (
        <DatabaseErrorMessage 
          error={vocabularyError} 
          onRetry={() => window.location.reload()}
          darkMode={darkMode}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Rechercher du vocabulaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`
                pl-10 pr-4 py-2 w-80 rounded-lg border transition-colors
                ${darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
            />
          </div>
          
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className={`
              px-3 py-2 rounded-lg border transition-colors
              ${darkMode 
                ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500/20
            `}
          >
            <option value="">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          {/* Menu de tri */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={`
                pl-3 pr-8 py-2 rounded-lg border transition-colors appearance-none
                ${darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500' 
                  : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500/20
              `}
            >
              <option value="alphabetical">Alphabétique (A-Z)</option>
              <option value="category">Par catégorie</option>
              <option value="mastery-desc">Maîtrise (élevée → faible)</option>
              <option value="mastery-asc">Maîtrise (faible → élevée)</option>
              <option value="difficulty-desc">Difficulté (élevée → faible)</option>
              <option value="difficulty-asc">Difficulté (faible → élevée)</option>
              <option value="recent">Récemment révisé</option>
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              {getSortIcon(sortBy)}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`
                p-2 transition-colors
                ${viewMode === 'cards'
                  ? 'bg-blue-500 text-white'
                  : darkMode 
                    ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('flashcards')}
              className={`
                p-2 transition-colors
                ${viewMode === 'flashcards'
                  ? 'bg-blue-500 text-white'
                  : darkMode 
                    ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <Brain className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddWord}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un mot</span>
          </button>
        </div>
      </div>

      {/* Barre alphabétique */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-lg p-4
      `}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Navigation alphabétique
          </h3>
          {selectedLetter && (
            <button
              onClick={() => setSelectedLetter(null)}
              className={`
                flex items-center space-x-1 text-xs px-2 py-1 rounded-lg transition-colors
                ${darkMode 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <X className="w-3 h-3" />
              <span>Tout afficher</span>
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-13 gap-1 sm:flex sm:flex-wrap sm:gap-2">
          {alphabet.map((letter) => {
            const count = getWordCountForLetter(letter);
            const isSelected = selectedLetter === letter;
            const hasWords = count > 0;
            
            return (
              <button
                key={letter}
                onClick={() => setSelectedLetter(isSelected ? null : letter)}
                disabled={!hasWords}
                className={`
                  relative flex flex-col items-center justify-center p-2 rounded-lg text-sm font-medium transition-all duration-200
                  min-w-[2.5rem] h-12
                  ${isSelected
                    ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-md transform scale-105'
                    : hasWords
                      ? darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                      : darkMode
                        ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }
                `}
                title={hasWords ? `${count} mot${count > 1 ? 's' : ''} commençant par ${letter}` : `Aucun mot commençant par ${letter}`}
              >
                <span className="text-base">{letter}</span>
                {hasWords && (
                  <span className={`
                    text-xs leading-none
                    ${isSelected ? 'text-blue-100' : darkMode ? 'text-gray-500' : 'text-gray-500'}
                  `}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        {selectedLetter && (
          <div className={`
            mt-3 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}
            flex items-center justify-between text-sm
          `}>
            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
              Affichage des mots commençant par <span className="font-semibold text-blue-500">{selectedLetter}</span>
            </span>
            <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredAndSortedVocabulary.length} résultat{filteredAndSortedVocabulary.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Indicateur de tri actif */}
      {sortBy !== 'alphabetical' && (
        <div className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg text-sm
          ${darkMode ? 'bg-blue-900/20 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'}
        `}>
          {getSortIcon(sortBy)}
          <span>Trié par: {getSortLabel(sortBy)}</span>
          <button
            onClick={() => setSortBy('alphabetical')}
            className={`ml-2 p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors`}
            title="Réinitialiser le tri"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total des mots</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {vocabulary.length}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Maîtrisés</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {vocabulary.filter(v => v.mastery >= 80).length}
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Catégories</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {categories.length}
              </p>
            </div>
            <Filter className="w-8 h-8 text-teal-500" />
          </div>
        </div>
        
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Maîtrise moy.</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {Math.round(vocabulary.reduce((acc, v) => acc + v.mastery, 0) / vocabulary.length) || 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Content */}
      {vocabularyLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : vocabularyError ? (
        <div className={`
          p-4 rounded-lg border
          ${darkMode ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-800'}
        `}>
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5" />
            <span>{vocabularyError}</span>
          </div>
        </div>
      ) : viewMode === 'flashcards' ? (
        <FlashcardView />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedVocabulary.map(entry => (
            <VocabularyCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {filteredAndSortedVocabulary.length === 0 && viewMode !== 'flashcards' && (
        <div className="text-center py-12">
          <BookOpen className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {selectedLetter 
              ? `Aucun mot trouvé commençant par "${selectedLetter}"`
              : 'Aucun vocabulaire trouvé'
            }
          </h3>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {selectedLetter 
              ? `Essayez une autre lettre ou supprimez le filtre alphabétique.`
              : 'Essayez d\'ajuster votre recherche ou ajoutez de nouveaux mots pour commencer.'
            }
          </p>
        </div>
      )}

      {/* Modal Ajout/Édition */}
      {(showAddModal || showEditModal) && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            resetForm();
          }} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6 w-96 max-h-[90vh] overflow-y-auto
          `}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {showEditModal ? 'Éditer le mot' : 'Ajouter un nouveau mot'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Mot *
                </label>
                <input
                  type="text"
                  value={formData.word}
                  onChange={(e) => setFormData({...formData, word: e.target.value})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="Entrez le mot"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Définition *
                </label>
                <textarea
                  value={formData.definition}
                  onChange={(e) => setFormData({...formData, definition: e.target.value})}
                  rows={3}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors resize-none
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="Entrez la définition"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Catégorie
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                >
                  <option value="General">Général</option>
                  <option value="Computer Science">Informatique</option>
                  <option value="AI/ML">IA/ML</option>
                  <option value="Business">Business</option>
                  <option value="Science">Science</option>
                  {categories.map(cat => (
                    !['General', 'Computer Science', 'AI/ML', 'Business', 'Science'].includes(cat) && (
                      <option key={cat} value={cat}>{cat}</option>
                    )
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Exemple
                </label>
                <input
                  type="text"
                  value={formData.example}
                  onChange={(e) => setFormData({...formData, example: e.target.value})}
                  className={`
                    w-full px-3 py-2 rounded-lg border transition-colors
                    ${darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                  `}
                  placeholder="Exemple d'utilisation (optionnel)"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Niveau de maîtrise: {formData.mastery}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.mastery}
                  onChange={(e) => setFormData({...formData, mastery: parseInt(e.target.value)})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Difficulté
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({...formData, difficulty: level as 1 | 2 | 3 | 4 | 5})}
                      className={`p-1 rounded transition-colors ${
                        formData.difficulty >= level 
                          ? 'text-yellow-400' 
                          : darkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'
                      }`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveWord}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all duration-200"
              >
                <Save className="w-4 h-4" />
                <span>{showEditModal ? 'Mettre à jour' : 'Ajouter'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal Suppression */}
      {showDeleteModal && selectedEntry && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowDeleteModal(false)} />
          <div className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50
            ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6 w-96
          `}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Confirmer la suppression
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className={`p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>
            <div className="space-y-4">
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Êtes-vous sûr de vouloir supprimer le mot "<span className="font-medium">{selectedEntry.word}</span>" ? 
                Cette action est irréversible.
              </p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    darkMode 
                      ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteWord}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}