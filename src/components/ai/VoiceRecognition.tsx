/**
 * 🎤 Composant de reconnaissance vocale pour le champ de recherche IA
 * Utilise Web Speech API (natif, pas d'API externe)
 * Compatible Chrome/Edge uniquement
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceRecognitionProps {
  inputId: string; // ID du champ input (ex: "rechercheIA")
  submitButtonId: string; // ID du bouton d'envoi (ex: "notes")
}

export function VoiceRecognition({ inputId, submitButtonId }: VoiceRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Vérifier si Web Speech API est supporté
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // Configuration de la reconnaissance vocale
      const recognition = recognitionRef.current;
      recognition.continuous = false; // Arrêt après une phrase
      recognition.interimResults = false; // Résultats finaux uniquement
      recognition.lang = 'fr-FR'; // Langue française
      
      // Gérer les résultats de la transcription
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 Transcription:', transcript);
        
        // Remplir le champ input
        const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement;
        if (input) {
          input.value = transcript;
          // Déclencher l'événement input pour que React détecte le changement
          const inputEvent = new Event('input', { bubbles: true });
          input.dispatchEvent(inputEvent);
          
          // Déclencher l'événement change aussi
          const changeEvent = new Event('change', { bubbles: true });
          input.dispatchEvent(changeEvent);
        }
        
        // Cliquer automatiquement sur le bouton d'envoi après un court délai
        setTimeout(() => {
          const submitButton = document.getElementById(submitButtonId) as HTMLButtonElement;
          if (submitButton) {
            console.log('🚀 Clic automatique sur le bouton d\'envoi');
            submitButton.click();
          } else {
            console.warn(`⚠️ Bouton d'envoi avec ID "${submitButtonId}" introuvable`);
          }
        }, 300); // Délai de 300ms pour laisser le temps à React de mettre à jour l'état
      };
      
      // Gérer les erreurs
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('❌ Erreur reconnaissance vocale:', event.error);
        setIsListening(false);
        
        // Afficher un message d'erreur à l'utilisateur
        if (event.error === 'no-speech') {
          alert('Aucune parole détectée. Veuillez réessayer.');
        } else if (event.error === 'not-allowed') {
          alert('Permission microphone refusée. Veuillez autoriser l\'accès au microphone.');
        } else {
          alert(`Erreur de reconnaissance vocale: ${event.error}`);
        }
      };
      
      // Arrêter l'écoute quand la reconnaissance se termine
      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      setIsSupported(false);
      console.warn('⚠️ Web Speech API non supportée dans ce navigateur');
    }
    
    // Nettoyage
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [inputId, submitButtonId]);

  // Démarrer/arrêter l'écoute
  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) {
      alert('Reconnaissance vocale non supportée dans ce navigateur. Utilisez Chrome ou Edge.');
      return;
    }

    if (isListening) {
      // Arrêter l'écoute
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Démarrer l'écoute
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('🎤 Écoute démarrée');
      } catch (error) {
        console.error('❌ Erreur démarrage écoute:', error);
        setIsListening(false);
      }
    }
  };

  // Si non supporté, ne rien afficher
  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`
        flex items-center justify-center
        w-10 h-10 rounded-full
        transition-all duration-200
        ${isListening
          ? 'bg-red-500 text-white animate-pulse shadow-lg'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
      title={isListening ? 'Arrêter l\'écoute' : 'Démarrer la reconnaissance vocale'}
      aria-label={isListening ? 'Arrêter l\'écoute' : 'Démarrer la reconnaissance vocale'}
    >
      {isListening ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}

