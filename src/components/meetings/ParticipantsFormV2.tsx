// 👥 Composant amélioré pour gérer les participants d'une réunion
import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, X, User, UserPlus, Upload, Clipboard, 
  AlertCircle, Check, Mail, Users, Crown
} from 'lucide-react';
import { MeetingParticipant } from '../../types/meetings';
import { usePlanLimits } from '../../hooks/usePlanLimits';

interface ParticipantsFormV2Props {
  participants: MeetingParticipant[];
  onChange: (participants: MeetingParticipant[]) => void;
  organizer: { name: string; email: string };
  darkMode?: boolean;
}

export function ParticipantsFormV2({ 
  participants, 
  onChange, 
  organizer, 
  darkMode = false 
}: ParticipantsFormV2Props) {
  // États
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Récupérer les limites du plan utilisateur
  const { limits } = usePlanLimits();
  const MAX_PARTICIPANTS = limits?.meeting_max_participants ?? 20; // Fallback à 20 si non défini
  const guestsCount = participants.filter(p => p.role !== 'organizer').length;
  const canAddMore = MAX_PARTICIPANTS === null || participants.length < MAX_PARTICIPANTS;

  // Générer les initiales pour l'avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Générer une couleur basée sur le nom
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Validation email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Parser l'input intelligent
  const parseSmartInput = (input: string): { name: string; email: string } | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Format: Nom Prénom <email@exemple.com>
    const fullFormatMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
    if (fullFormatMatch) {
      return {
        name: fullFormatMatch[1].trim(),
        email: fullFormatMatch[2].trim()
      };
    }

    // Format: email seul
    if (isValidEmail(trimmed)) {
      const namePart = trimmed.split('@')[0];
      // Transformer email en nom (reda.sahraoui@gmail.com -> Reda Sahraoui)
      const name = namePart
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      return {
        name,
        email: trimmed
      };
    }

    // Format: nom seul (invalide pour notre cas)
    return null;
  };

  // Vérifier les doublons
  const isDuplicate = (email: string): boolean => {
    return participants.some(p => 
      p.email.toLowerCase() === email.toLowerCase()
    );
  };

  // Ajouter un participant via l'input intelligent
  const handleSmartAdd = () => {
    if (!canAddMore) {
      setInputError('Limite de 20 participants atteinte');
      return;
    }

    const parsed = parseSmartInput(inputValue);
    
    if (!parsed) {
      setInputError('Format invalide. Utilisez: email@exemple.com ou Nom <email@exemple.com>');
      return;
    }

    if (!isValidEmail(parsed.email)) {
      setInputError('Adresse email invalide');
      return;
    }

    if (isDuplicate(parsed.email)) {
      setInputError('Cet invité existe déjà');
      return;
    }

    // Ajouter le participant
    const newParticipant: MeetingParticipant = {
      id: crypto.randomUUID(),
      name: parsed.name,
      email: parsed.email,
      role: 'guest'
    };

    onChange([...participants, newParticipant]);
    
    // Reset
    setInputValue('');
    setInputError('');
    inputRef.current?.focus();
  };

  // Gérer l'appui sur Entrée
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSmartAdd();
    }
  };

  // Supprimer un participant
  const removeParticipant = (id: string) => {
    const participant = participants.find(p => p.id === id);
    if (participant?.role === 'organizer') return; // Ne pas supprimer l'organisateur
    
    onChange(participants.filter(p => p.id !== id));
  };

  // Parser une liste d'emails collée
  const parsePastedList = (text: string): Array<{ name: string; email: string }> => {
    const lines = text.split(/[\n,;]+/).filter(line => line.trim());
    const results: Array<{ name: string; email: string }> = [];

    lines.forEach(line => {
      const parsed = parseSmartInput(line);
      if (parsed && !isDuplicate(parsed.email)) {
        results.push(parsed);
      }
    });

    return results;
  };

  // Gérer le collage de liste
  const handlePasteList = () => {
    const parsed = parsePastedList(pasteContent);
    const availableSlots = MAX_PARTICIPANTS === null ? parsed.length : MAX_PARTICIPANTS - participants.length;
    const toAdd = parsed.slice(0, availableSlots);

    const newParticipants = toAdd.map(p => ({
      id: crypto.randomUUID(),
      name: p.name,
      email: p.email,
      role: 'guest' as const
    }));

    onChange([...participants, ...newParticipants]);
    
    setShowPasteModal(false);
    setPasteContent('');
    
    if (toAdd.length < parsed.length) {
      alert(`${toAdd.length} participants ajoutés (limite atteinte)`);
    }
  };

  // Gérer l'import CSV
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parsePastedList(text);
      const availableSlots = MAX_PARTICIPANTS === null ? parsed.length : MAX_PARTICIPANTS - participants.length;
      const toAdd = parsed.slice(0, availableSlots);

      const newParticipants = toAdd.map(p => ({
        id: crypto.randomUUID(),
        name: p.name,
        email: p.email,
        role: 'guest' as const
      }));

      onChange([...participants, ...newParticipants]);
      
      if (toAdd.length > 0) {
        alert(`✅ ${toAdd.length} participants importés`);
      }
    };
    reader.readAsText(file);
    
    // Reset input file
    e.target.value = '';
  };

  // Validation en temps réel
  useEffect(() => {
    if (inputValue && !parseSmartInput(inputValue)) {
      const timer = setTimeout(() => {
        if (inputValue.includes('@') && !isValidEmail(inputValue)) {
          setInputError('Email invalide');
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setInputError('');
    }
  }, [inputValue]);

  return (
    <div className="space-y-4">
      {/* Header avec compteur */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <Users className="inline w-4 h-4 mr-1" />
            Participants
          </h4>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {participants.length}{MAX_PARTICIPANTS !== null ? `/${MAX_PARTICIPANTS}` : ''} participants ajoutés • {guestsCount} invité{guestsCount !== 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Actions rapides */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            disabled={!canAddMore}
            className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-lg transition ${
              canAddMore 
                ? darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
            }`}
            title="Coller une liste d'emails"
          >
            <Clipboard className="w-4 h-4" />
            <span>Coller liste</span>
          </button>
          
          <label className={`relative ${!canAddMore ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVImport}
              disabled={!canAddMore}
              className="sr-only"
            />
            <button
              type="button"
              className={`flex items-center space-x-1 px-3 py-1.5 text-sm rounded-lg transition ${
                canAddMore
                  ? darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              title="Importer CSV"
            >
              <Upload className="w-4 h-4" />
              <span>Importer CSV</span>
            </button>
          </label>
        </div>
      </div>

      {/* Champ d'ajout intelligent */}
      <div className="space-y-2">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="email@exemple.com ou Nom Prénom <email@exemple.com>"
            disabled={!canAddMore}
            className={`w-full pl-10 pr-20 py-3 rounded-lg border transition-all ${
              inputError 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500/20'
            } ${!canAddMore ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          
          {/* Icône */}
          <UserPlus className={`absolute left-3 top-3.5 w-5 h-5 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          
          {/* Bouton ajouter */}
          <button
            type="button"
            onClick={handleSmartAdd}
            disabled={!canAddMore || !inputValue.trim()}
            className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition leading-none ${
              !canAddMore || !inputValue.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Ajouter
          </button>
        </div>
        
        {/* Message d'erreur */}
        {inputError && (
          <div className="flex items-center space-x-1 text-red-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{inputError}</span>
          </div>
        )}
        
        {/* Aide */}
        {!inputError && !inputValue && (
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            💡 Appuyez sur Entrée pour ajouter rapidement
          </p>
        )}
      </div>

      {/* Liste des participants (Pills/Badges) */}
      <div className="space-y-2">
        {participants.map((participant) => {
          const isOrganizer = participant.role === 'organizer';
          
          return (
            <div
              key={participant.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              } ${isOrganizer ? 'ring-2 ring-blue-500/20' : ''}`}
            >
              <div className="flex items-center space-x-3">
                {/* Avatar avec initiales */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                  getAvatarColor(participant.name)
                }`}>
                  {getInitials(participant.name)}
                </div>
                
                {/* Infos */}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {participant.name}
                    </span>
                    
                    {/* Badge de rôle */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isOrganizer
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {isOrganizer ? (
                        <>
                          <Crown className="w-3 h-3 mr-1" />
                          Organisateur
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 mr-1" />
                          Invité
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-sm">
                    <Mail className="w-3 h-3" />
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {participant.email}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Bouton supprimer */}
              {!isOrganizer && (
                <button
                  type="button"
                  onClick={() => removeParticipant(participant.id)}
                  className={`p-1.5 rounded-lg transition ${
                    darkMode 
                      ? 'hover:bg-red-900/20 text-gray-400 hover:text-red-400' 
                      : 'hover:bg-red-50 text-gray-500 hover:text-red-500'
                  }`}
                  title="Supprimer ce participant"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de collage */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-lg mx-4 p-6 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Coller une liste d'emails
            </h3>
            
            <textarea
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Collez vos emails ici (un par ligne ou séparés par des virgules)"
              className={`w-full h-32 p-3 rounded-lg border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              autoFocus
            />
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowPasteModal(false);
                  setPasteContent('');
                }}
                className={`px-4 py-2 rounded-lg ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Annuler
              </button>
              
              <button
                type="button"
                onClick={handlePasteList}
                disabled={!pasteContent.trim()}
                className={`px-4 py-2 rounded-lg font-medium ${
                  !pasteContent.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Ajouter les participants
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}