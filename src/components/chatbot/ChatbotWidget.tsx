/**
 * Widget de Chatbot pour Centrinote
 * Intégré dans la section Contact pour aider les utilisateurs
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, X, Minimize2, Maximize2, Mail, MessageCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { chatbotService } from '../../services/chatbotService';
import { analyzeMessage } from '../../utils/noteoMessageDetector';

interface ValidationButton {
  id: string;
  label: string;
  action: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other';
  emoji: string;
}

interface Message {
  id: string;
  type: 'user' | 'bot' | 'system';
  content: string;
  timestamp: Date;
  requiresEscalation?: boolean;
  escalationData?: {
    ticketId?: string;
    emailDraft?: string;
  };
  showConfirmationButtons?: boolean;
  validationButtons?: ValidationButton[];
  intent?: 'tutorial' | 'diagnostic' | 'resolved' | 'escalate';
  feature?: string;
}

interface ChatbotWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialMinimized?: boolean;
}


/**
 * Composant de boutons de confirmation (ANCIEN - gardé pour compatibilité)
 */
function ConfirmationButtons({
  onResolved,
  onNotResolved,
  darkMode
}: {
  onResolved: () => void;
  onNotResolved: () => void;
  darkMode: boolean;
}) {
  return (
    <div className={`
      mt-4 pt-3 border-t
      ${darkMode ? 'border-gray-600/50' : 'border-gray-200'}
    `}>
      <p className={`
        text-xs font-medium mb-2
        ${darkMode ? 'text-gray-400' : 'text-gray-600'}
      `}>
        Cette réponse vous aide-t-elle ?
      </p>
      <div className="flex gap-2">
        <button
          onClick={onResolved}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
            text-xs font-medium transition-all duration-150
            ${darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
            }
            hover:scale-[1.01]
          `}
        >
          <span className="text-sm">✓</span>
          <span>Oui, merci</span>
        </button>
        <button
          onClick={onNotResolved}
          className={`
            flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
            text-xs font-medium transition-all duration-150
            ${darkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
            }
            hover:scale-[1.01]
          `}
        >
          <span className="text-sm">✗</span>
          <span>Pas encore</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Composant de boutons de validation dynamiques (NOUVEAU - pipeline issue-tracker)
 */
function ValidationButtons({
  buttons,
  onButtonClick,
  darkMode
}: {
  buttons: ValidationButton[];
  onButtonClick: (action: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other') => void;
  darkMode: boolean;
}) {
  if (!buttons || buttons.length === 0) return null;

  return (
    <div className={`
      mt-4 pt-3 border-t
      ${darkMode ? 'border-gray-600/50' : 'border-gray-200'}
    `}>
      <p className={`
        text-xs font-medium mb-2
        ${darkMode ? 'text-gray-400' : 'text-gray-600'}
      `}>
        Cette réponse vous aide-t-elle ?
      </p>
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <button
            key={button.id}
            onClick={() => onButtonClick(button.action)}
            className={`
              flex items-center justify-center gap-1.5 px-3 py-2 rounded-md
              text-xs font-medium transition-all duration-150
              ${button.action === 'works'
                ? darkMode
                  ? 'bg-green-700 hover:bg-green-600 text-white border border-green-600'
                  : 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-300'
                : button.action === 'still_blocked'
                ? darkMode
                  ? 'bg-orange-700 hover:bg-orange-600 text-white border border-orange-600'
                  : 'bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-300'
                : darkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
              }
              hover:scale-[1.01]
            `}
          >
            <span className="text-sm">{button.emoji}</span>
            <span>{button.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Composant d'escalation simplifié - Email uniquement
 */
function EscalationCard({ 
  onEscalate, 
  darkMode 
}: { 
  onEscalate: () => void; 
  darkMode: boolean;
}) {
  return (
    <div className={`
      mt-3 pt-3 border-t
      ${darkMode ? 'border-gray-600' : 'border-gray-300'}
    `}>
      <div className={`
        p-3 rounded-lg
        ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}
      `}>
        <p className={`
          text-sm mb-3
          ${darkMode ? 'text-gray-300' : 'text-gray-700'}
        `}>
          Je comprends que le problème persiste malgré nos tentatives. Notre équipe va examiner votre cas en détail.
        </p>
        <button
          onClick={onEscalate}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
            text-sm font-medium transition-all duration-200
            ${darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
            }
            hover:scale-[1.02] hover:shadow-md
          `}
        >
          <Mail className="w-4 h-4" />
          <span>📧 Envoyer un email au support</span>
        </button>
        <p className={`
          text-xs mt-2 text-center
          ${darkMode ? 'text-gray-400' : 'text-gray-500'}
        `}>
          Un email avec le résumé du problème sera automatiquement généré et envoyé à notre équipe
        </p>
      </div>
    </div>
  );
}

export function ChatbotWidget({ 
  position = 'bottom-right',
  initialMinimized = true 
}: ChatbotWidgetProps) {
  const { state } = useApp();
  const { darkMode, user } = state;
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: t('chatbot_welcome') || 'Bonjour ! Je suis Noteo, votre assistant IA. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [failureCount, setFailureCount] = useState(0); // Compteur de clics "Non, toujours bloqué"
  const [conversationId, setConversationId] = useState<string | null>(() => {
    // Récupérer depuis localStorage ou générer un nouveau
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('noteo_conversation_id');
      if (stored) return stored;
      
      // Générer un nouveau ID unique
      const newId = `conv-${Date.now()}-${user?.id || 'anon'}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('noteo_conversation_id', newId);
      return newId;
    }
    return null;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    // Scroll instantané pour éviter les animations lentes
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  useEffect(() => {
    // Utiliser requestAnimationFrame pour un scroll fluide sans bloquer le rendu
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [inputValue]);

  // Écouter l'événement personnalisé pour ouvrir le chatbot
  useEffect(() => {
    const handleOpenChatbot = () => {
      setIsMinimized(false);
    };

    window.addEventListener('open-chatbot', handleOpenChatbot);
    
    return () => {
      window.removeEventListener('open-chatbot', handleOpenChatbot);
    };
  }, []);

  // Mettre à jour conversation_id si l'utilisateur change
  useEffect(() => {
    if (user?.id && conversationId && !conversationId.includes(user.id)) {
      // Générer un nouveau ID si l'utilisateur change
      const newId = `conv-${Date.now()}-${user.id}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('noteo_conversation_id', newId);
      setConversationId(newId);
    }
  }, [user?.id, conversationId]);

  // Réinitialiser conversation_id après résolution/escalade (une seule fois)
  const lastIntentRef = useRef<string | undefined>();
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.intent && 
        (lastMessage.intent === 'resolved' || lastMessage.intent === 'escalate') &&
        lastIntentRef.current !== lastMessage.intent) {
      // Nettoyer le conversation_id après résolution/escalade (une seule fois)
      lastIntentRef.current = lastMessage.intent;
      localStorage.removeItem('noteo_conversation_id');
      const newId = `conv-${Date.now()}-${user?.id || 'anon'}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('noteo_conversation_id', newId);
      setConversationId(newId);
    }
  }, [messages, user?.id]);

  const addMessage = (type: 'user' | 'bot' | 'system', content: string, escalationData?: any) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      requiresEscalation: escalationData ? true : false,
      escalationData
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const handleSend = async (buttonClicked?: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other') => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Ajouter le message de l'utilisateur
    addMessage('user', userMessage);

    try {
      // Envoyer au service chatbot avec button_clicked si présent
      const response = await chatbotService.sendMessage({
        message: userMessage,
        userId: user?.id || 'anonymous',
        userEmail: user?.email || '',
        userName: user?.name || user?.email || 'Utilisateur',
        conversationHistory: messages.slice(-5).map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        button_clicked: buttonClicked, // NOUVEAU : envoyer l'action du bouton cliqué
        conversation_id: conversationId // ✅ AJOUTER conversation_id
      });

      // DEBUG: Logger la réponse complète
      console.log('[ChatbotWidget] 📥 Réponse du backend:', {
        message: response.message,
        messageLength: response.message?.length,
        validationButtons: response.validationButtons,
        intent: response.intent,
        feature: response.feature
      });

      // Ajouter la réponse du bot
      if (response.requiresEscalation) {
        addMessage('bot', response.message, {
          ticketId: response.ticketId,
          emailDraft: response.emailDraft
        });
        setShowEscalation(true);
      } else {
        const newMessage = addMessage('bot', response.message);

        // NOUVEAU : Ajouter les boutons de validation dynamiques si présents
        if (response.validationButtons && response.validationButtons.length > 0) {
          setMessages(prev => prev.map(msg =>
            msg.id === newMessage.id
              ? {
                  ...msg,
                  validationButtons: response.validationButtons,
                  intent: response.intent,
                  feature: response.feature
                }
              : msg
          ));
        }
        // ANCIEN : Fallback sur les boutons de confirmation classiques
        else if (response.showConfirmationButtons) {
          setMessages(prev => prev.map(msg =>
            msg.id === newMessage.id
              ? { ...msg, showConfirmationButtons: true }
              : msg
          ));
        }
      }
    } catch (error) {
      console.error('Erreur chatbot:', error);
      addMessage('bot', t('chatbot_error') || 'Désolé, une erreur s\'est produite. Voulez-vous que je vous aide à rédiger un email à notre équipe de support ?');
      setShowEscalation(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidationButtonClick = async (action: 'works' | 'still_blocked' | 'cant_find_button' | 'save_error' | 'other') => {
    if (isLoading) return;

    // Retirer les boutons de validation du message précédent immédiatement
    setMessages(prev => prev.map(msg =>
      msg.validationButtons ? { ...msg, validationButtons: undefined } : msg
    ));

    // Déterminer le message utilisateur basé sur l'action
    let userMessage = '';
    let userDisplayMessage = '';

    switch (action) {
      case 'works':
        userMessage = 'ça marche maintenant, merci !';
        userDisplayMessage = '✅ Ça marche !';
        setFailureCount(0); // Réinitialiser le compteur
        break;
      case 'still_blocked':
        userMessage = 'toujours bloqué, j\'ai essayé mais ça ne fonctionne pas';
        userDisplayMessage = '⚠️ Toujours bloqué';
        setFailureCount(prev => prev + 1);
        break;
      case 'cant_find_button':
        userMessage = 'je ne trouve pas le bouton dont tu parles';
        userDisplayMessage = '🔍 Je ne trouve pas le bouton';
        break;
      case 'save_error':
        userMessage = 'j\'ai une erreur lors de l\'enregistrement';
        userDisplayMessage = '⚠️ J\'ai une erreur';
        break;
      case 'other':
        userMessage = 'j\'ai un autre problème';
        userDisplayMessage = '💬 Autre problème';
        break;
    }

    setIsLoading(true);

    // Ajouter le message de l'utilisateur avec le display emoji
    addMessage('user', userDisplayMessage);

    try {
      // Envoyer au service chatbot avec button_clicked
      const response = await chatbotService.sendMessage({
        message: userMessage,
        userId: user?.id || 'anonymous',
        userEmail: user?.email || '',
        userName: user?.name || user?.email || 'Utilisateur',
        conversationHistory: messages.slice(-5).map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        button_clicked: action, // IMPORTANT : envoyer l'action du bouton
        conversation_id: conversationId // ✅ AJOUTER conversation_id
      });

      // Ajouter la réponse du bot
      if (response.requiresEscalation) {
        addMessage('bot', response.message, {
          ticketId: response.ticketId,
          emailDraft: response.emailDraft
        });
        setShowEscalation(true);
      } else {
        const newMessage = addMessage('bot', response.message);

        // Ajouter les nouveaux boutons de validation si présents
        if (response.validationButtons && response.validationButtons.length > 0) {
          setMessages(prev => prev.map(msg =>
            msg.id === newMessage.id
              ? {
                  ...msg,
                  validationButtons: response.validationButtons,
                  intent: response.intent,
                  feature: response.feature
                }
              : msg
          ));
        }
        // Fallback sur les boutons de confirmation classiques
        else if (response.showConfirmationButtons) {
          setMessages(prev => prev.map(msg =>
            msg.id === newMessage.id
              ? { ...msg, showConfirmationButtons: true }
              : msg
          ));
        }
      }
    } catch (error) {
      console.error('Erreur chatbot:', error);
      addMessage('bot', 'Désolé, une erreur s\'est produite. Je vais t\'aider à contacter notre équipe de support.');
      setShowEscalation(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProblemResolved = async () => {
    // Réinitialiser le compteur d'échecs car le problème est résolu
    setFailureCount(0);

    // Envoyer "oui" au chatbot pour obtenir une astuce
    const userMessage = 'oui, c\'est réglé, merci pour ton aide';
    setInputValue('');
    setIsLoading(true);

      addMessage('user', '👍 Oui, super !');

    // Retirer les boutons de confirmation du message précédent immédiatement
    setMessages(prev => prev.map(msg =>
      msg.showConfirmationButtons ? { ...msg, showConfirmationButtons: false } : msg
    ));

    try {
      const response = await chatbotService.sendMessage({
        message: userMessage,
        userId: user?.id || 'anonymous',
        userEmail: user?.email || '',
        userName: user?.name || user?.email || 'Utilisateur',
        conversationHistory: messages.slice(-5).map(m => ({
          role: m.type === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        conversation_id: conversationId // ✅ AJOUTER conversation_id
      });

      addMessage('bot', response.message);
    } catch (error) {
      console.error('Erreur chatbot:', error);
      addMessage('bot', 'Super ! Je suis content que ça fonctionne maintenant. 😊\n\n💡 N\'hésite pas à explorer les autres fonctionnalités de Centrinote !');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProblemNotResolved = async () => {
    // Incrémenter le compteur d'échecs
    const newFailureCount = failureCount + 1;
    setFailureCount(newFailureCount);

    // Envoyer "non" au chatbot pour déclencher l'escalation
    const userMessage = 'non, toujours bloqué';
    setInputValue('');
    setIsLoading(true);

    // Ne pas afficher de message utilisateur, laisser le bot répondre directement

    // Retirer les boutons de confirmation du message précédent immédiatement
    setMessages(prev => prev.map(msg =>
      msg.showConfirmationButtons ? { ...msg, showConfirmationButtons: false } : msg
    ));

    try {
      // Si c'est le 2ème échec, déclencher l'escalation automatiquement
      if (newFailureCount >= 2) {
        console.log('[ChatbotWidget] 2 échecs détectés, escalation automatique');

        // Récupérer les informations de contexte (navigateur, appareil, etc.)
        const userAgent = navigator.userAgent;
        const browserInfo = {
          navigateur: /Firefox/.test(userAgent) ? 'Firefox' :
                     /Chrome/.test(userAgent) ? 'Chrome' :
                     /Safari/.test(userAgent) ? 'Safari' :
                     /Edge/.test(userAgent) ? 'Edge' : 'Autre',
          appareil: /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'Mobile' : 'Ordinateur',
          systeme: /Windows/.test(userAgent) ? 'Windows' :
                   /Mac/.test(userAgent) ? 'MacOS' :
                   /Linux/.test(userAgent) ? 'Linux' :
                   /Android/.test(userAgent) ? 'Android' :
                   /iOS|iPhone|iPad/.test(userAgent) ? 'iOS' : 'Autre',
          langue: navigator.language || 'fr-FR',
          heureLocale: new Date().toLocaleString('fr-FR')
        };

        // Générer un email pré-rempli avec le résumé complet
        const conversationSummary = messages
          .slice(-10) // Prendre les 10 derniers messages
          .map(m => `${m.type === 'user' ? 'Moi' : 'Assistant'}: ${m.content}`)
          .join('\n\n');

        const emailDraft = `=== DEMANDE DE SUPPORT CENTRINOTE ===

📋 RÉSUMÉ DU PROBLÈME :
${conversationSummary}

---

✅ ÉTAPES DÉJÀ TESTÉES :
${messages
  .filter(m => m.type === 'bot' && (m.content.includes('✅') || m.content.includes('vérifier') || m.content.includes('essayer')))
  .map((m, i) => `${i + 1}. ${m.content.split('\n')[0]}`)
  .join('\n')}

---

💻 INFORMATIONS TECHNIQUES :
• Navigateur : ${browserInfo.navigateur}
• Appareil : ${browserInfo.appareil}
• Système d'exploitation : ${browserInfo.systeme}
• Langue : ${browserInfo.langue}
• Heure locale : ${browserInfo.heureLocale}
• Utilisateur : ${user?.name || user?.email || 'Anonyme'}
• Email : ${user?.email || 'Non renseigné'}

---

Note : Cette demande a été générée automatiquement après 2 tentatives infructueuses de résolution via le chatbot.
`;

        // Créer le message d'escalation avec un ton rassurant
        const escalationMessage = `⚠️ Pas de panique !\n\nJe vais faire passer ton problème à l'équipe qui va t'aider personnellement.\n\nJ'ai préparé un petit message avec :\n• Le résumé de ton problème\n• Les trucs qu'on a déjà testés ensemble\n• Tes infos techniques (${browserInfo.navigateur}, ${browserInfo.systeme})\n\nTu veux qu'on l'envoie ensemble ?`;

        const botMessage = addMessage('bot', escalationMessage, {
          ticketId: `temp-${Date.now()}`,
          emailDraft: emailDraft
        });

        // **ENVOYER L'EMAIL AUTOMATIQUEMENT** - Appel DIRECT à notify-support (comme le formulaire)
        console.log('[ChatbotWidget] 📧 Envoi automatique vers notify-support...');

        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-support`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                name: user?.name || user?.email?.split('@')[0] || 'Utilisateur Chatbot',
                email: user?.email || 'noreply@centrinote.fr',
                subject: `[Chatbot] Support automatique - ${user?.name || 'Utilisateur'}`,
                message: emailDraft,
              }),
            }
          );

          const data = await response.json();
          console.log('[ChatbotWidget] 📥 Réponse de notify-support:', data);

          if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de l\'envoi du message');
          }

          if (data.success && data.id) {
            console.log('[ChatbotWidget] ✅ Email envoyé avec succès, ID:', data.id);
            addMessage('system', `📨 Votre demande a bien été envoyée à notre équipe.\n\n✅ Vous recevrez une réponse sous 24h. Merci pour votre patience !`);
          } else {
            throw new Error('Réponse invalide de notify-support');
          }
        } catch (emailError) {
          console.error('[ChatbotWidget] ❌ Erreur lors de l\'envoi de l\'email:', emailError);
          addMessage('system', '⚠️ Une erreur est survenue lors de l\'envoi de l\'email. Veuillez réessayer en cliquant sur le bouton ci-dessous.');
          setShowEscalation(true);
        }
      } else {
        // Premier échec : continuer normalement
        const response = await chatbotService.sendMessage({
          message: userMessage,
          userId: user?.id || 'anonymous',
          userEmail: user?.email || '',
          userName: user?.name || user?.email || 'Utilisateur',
          conversationHistory: messages.slice(-5).map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          button_clicked: 'still_blocked', // ✅ IMPORTANT : Indiquer que c'est un clic "Pas encore"
          conversation_id: conversationId // ✅ AJOUTER conversation_id
        });

        if (response.requiresEscalation) {
          addMessage('bot', response.message, {
            ticketId: response.ticketId,
            emailDraft: response.emailDraft
          });
          setShowEscalation(true);
        } else {
          const newMessage = addMessage('bot', response.message);
          // Ajouter les boutons de confirmation si nécessaire
          if (response.showConfirmationButtons) {
            setMessages(prev => prev.map(msg =>
              msg.id === newMessage.id
                ? { ...msg, showConfirmationButtons: true }
                : msg
            ));
          }
        }
      }
    } catch (error) {
      console.error('Erreur chatbot:', error);
      addMessage('bot', 'Je comprends. Je vais t\'aider à contacter notre équipe de support.');
      setShowEscalation(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalateToEmail = async () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.escalationData) return;

    try {
      setIsLoading(true);

      // Appel DIRECT à notify-support (comme le formulaire de contact)
      console.log('[ChatbotWidget] 📧 Envoi manuel vers notify-support...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-support`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            name: user?.name || user?.email?.split('@')[0] || 'Utilisateur Chatbot',
            email: user?.email || 'noreply@centrinote.fr',
            subject: `[Chatbot] Support manuel - ${user?.name || 'Utilisateur'}`,
            message: lastMessage.escalationData.emailDraft || messages.map(m => `${m.type}: ${m.content}`).join('\n\n'),
          }),
        }
      );

      const data = await response.json();
      console.log('[ChatbotWidget] 📥 Réponse de notify-support:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du message');
      }

      if (data.success && data.id) {
        console.log('[ChatbotWidget] ✅ Email envoyé avec succès, ID:', data.id);
        addMessage('system', `📨 Votre demande a bien été envoyée à notre équipe.\n\n✅ Vous recevrez une réponse sous 24h. Merci pour votre patience !`);
        setShowEscalation(false);
      } else {
        throw new Error('Réponse invalide de notify-support');
      }
    } catch (error) {
      console.error('[ChatbotWidget] ❌ Erreur escalation:', error);
      addMessage('system', t('chatbot_email_error') || 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };


  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`
          fixed ${positionClasses[position]}
          z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg
          transition-all duration-300 hover:scale-105
          ${darkMode 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-blue-500 text-white hover:bg-blue-600'
          }
        `}
        aria-label={t('chatbot_open') || 'Ouvrir le chatbot'}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium">{t('chatbot_need_help') || 'Besoin d\'aide ?'}</span>
      </button>
    );
  }

  return (
    <div
      className={`
        fixed ${positionClasses[position]}
        z-50 w-96 h-[600px] rounded-lg shadow-2xl
        flex flex-col
        ${darkMode 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
        transition-all duration-300
      `}
    >
      {/* Header */}
      <div
        className={`
          flex items-center justify-between p-4 border-b
          ${darkMode ? 'border-gray-700' : 'border-gray-200'}
        `}
      >
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('chatbot_title') || 'Noteo'}
            </h3>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('chatbot_subtitle') || 'Je suis là pour vous aider'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className={`
              p-1.5 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-500'
              }
            `}
            aria-label={t('chatbot_minimize') || 'Réduire'}
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className={`
              p-1.5 rounded-lg transition-colors
              ${darkMode 
                ? 'hover:bg-gray-700 text-gray-400' 
                : 'hover:bg-gray-100 text-gray-500'
              }
            `}
            aria-label={t('chatbot_close') || 'Fermer'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        className={`
          flex-1 overflow-y-auto p-4 space-y-4
          ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}
        `}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] rounded-lg p-4
                ${
                  message.type === 'user'
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-500 text-white shadow-md'
                    : message.type === 'system'
                    ? darkMode
                      ? 'bg-yellow-900/30 text-yellow-200 border border-yellow-700 shadow-md'
                      : 'bg-yellow-50 text-yellow-800 border border-yellow-200 shadow-md'
                    : darkMode
                    ? 'bg-gray-800 text-gray-100 border border-gray-700 shadow-md hover:shadow-lg transition-all'
                    : 'bg-white text-gray-900 border border-gray-200 shadow-md hover:shadow-lg transition-all'
                }
              `}
            >
              <div className="text-sm whitespace-pre-wrap">
                {message.content}
              </div>
              {/* NOUVEAU : Boutons de validation dynamiques */}
              {message.validationButtons && message.validationButtons.length > 0 && (
                <ValidationButtons
                  buttons={message.validationButtons}
                  onButtonClick={handleValidationButtonClick}
                  darkMode={darkMode}
                />
              )}
              {/* ANCIEN : Fallback sur les boutons de confirmation classiques */}
              {!message.validationButtons && message.showConfirmationButtons && (
                <ConfirmationButtons
                  onResolved={handleProblemResolved}
                  onNotResolved={handleProblemNotResolved}
                  darkMode={darkMode}
                />
              )}
              {message.requiresEscalation && message.escalationData && (
                <EscalationCard
                  onEscalate={handleEscalateToEmail}
                  darkMode={darkMode}
                />
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div
              className={`
                rounded-lg px-4 py-2
                ${darkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}
              `}
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className={`
          p-4 border-t
          ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}
        `}
      >
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder={t('chatbot_placeholder') || 'Tapez votre message...'}
            disabled={isLoading}
            className={`
              flex-1 px-4 py-2 rounded-lg border resize-none overflow-y-auto
              min-h-[2.5rem] max-h-[8rem]
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label={t('chatbot_send') || 'Envoyer'}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

