// 📝 Champ titre avec validation et feedback immédiat
import React, { useState, useRef } from 'react';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface MeetingTitleFieldProps {
  title: string;
  description: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  error?: string | null;
}

export function MeetingTitleField({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  error
}: MeetingTitleFieldProps) {
  const { state } = useApp();
  const { darkMode } = state;
  
  const [titleFocused, setTitleFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const isTitleValid = title.trim().length > 0;
  const titleLength = title.length;
  const maxTitleLength = 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <FileText className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Informations générales
        </h3>
        {isTitleValid && (
          <CheckCircle className="w-4 h-4 text-green-500" />
        )}
      </div>

      {/* Titre */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={`text-sm font-semibold ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Titre de la réunion *
          </label>
          <div className={`text-xs ${
            titleLength > maxTitleLength 
              ? 'text-red-500' 
              : (darkMode ? 'text-gray-400' : 'text-gray-500')
          }`}>
            {titleLength}/{maxTitleLength}
          </div>
        </div>
        
        <div className="relative">
          <input
            ref={titleRef}
            type="text"
            required
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            placeholder="Ex: Réunion équipe hebdomadaire"
            maxLength={maxTitleLength}
            className={`w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 ${
              error || titleLength > maxTitleLength
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : isTitleValid
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500/20'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20'
            } ${
              darkMode 
                ? 'bg-gray-700 text-white placeholder-gray-400' 
                : 'bg-white text-gray-900 placeholder-gray-500'
            } ${
              titleFocused ? 'scale-[1.01] shadow-lg' : 'hover:shadow-md'
            }`}
          />
          
          {/* Indicateur visuel de statut */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isTitleValid && !error && titleLength <= maxTitleLength && (
              <CheckCircle className="w-5 h-5 text-green-500 animate-in zoom-in duration-200" />
            )}
            {(error || titleLength > maxTitleLength) && (
              <AlertCircle className="w-5 h-5 text-red-500 animate-in zoom-in duration-200" />
            )}
          </div>
        </div>

        {/* Messages d'aide */}
        <div className="space-y-1">
          {error && (
            <div className={`flex items-center space-x-2 text-red-500 text-sm animate-in slide-in-from-left duration-200`}>
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          
          {!error && titleLength > maxTitleLength && (
            <div className={`flex items-center space-x-2 text-red-500 text-sm animate-in slide-in-from-left duration-200`}>
              <AlertCircle className="w-4 h-4" />
              <span>Le titre est trop long (maximum {maxTitleLength} caractères)</span>
            </div>
          )}
          
          {!error && isTitleValid && titleLength <= maxTitleLength && (
            <div className={`flex items-center space-x-2 text-green-600 text-sm animate-in slide-in-from-left duration-200`}>
              <CheckCircle className="w-4 h-4" />
              <span>Titre valide</span>
            </div>
          )}

          {!isTitleValid && !titleFocused && (
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              💡 Choisissez un titre clair et descriptif pour votre réunion
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className={`text-sm font-semibold ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Description (optionnel)
        </label>
        
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            onFocus={() => setDescriptionFocused(true)}
            onBlur={() => setDescriptionFocused(false)}
            placeholder="Ordre du jour, points à discuter, documents à préparer..."
            rows={3}
            maxLength={500}
            className={`w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 resize-none focus:border-blue-500 focus:ring-blue-500/20 ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } ${
              descriptionFocused ? 'scale-[1.01] shadow-lg' : 'hover:shadow-md'
            }`}
          />
          
          {/* Compteur de caractères pour description */}
          <div className={`absolute bottom-2 right-3 text-xs ${
            description.length > 450
              ? 'text-yellow-500'
              : (darkMode ? 'text-gray-500' : 'text-gray-400')
          }`}>
            {description.length}/500
          </div>
        </div>

        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          💡 Une description aide les participants à se préparer à la réunion
        </div>
      </div>

      {/* Suggestions dynamiques basées sur le contenu */}
      {title.trim() && (
        <div className={`p-3 rounded-lg border ${
          darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className={`text-sm font-medium mb-1 ${
            darkMode ? 'text-blue-400' : 'text-blue-800'
          }`}>
            💡 Suggestions pour "{title.substring(0, 30)}..."
          </div>
          <ul className={`text-xs space-y-1 ${
            darkMode ? 'text-blue-300' : 'text-blue-700'
          }`}>
            <li>• Préparez l'ordre du jour à l'avance</li>
            <li>• Définissez la durée estimée</li>
            <li>• Partagez les documents pertinents</li>
            {title.toLowerCase().includes('équipe') && (
              <li>• Pensez aux points de suivi des projets en cours</li>
            )}
            {title.toLowerCase().includes('client') && (
              <li>• Préparez les éléments de présentation</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}