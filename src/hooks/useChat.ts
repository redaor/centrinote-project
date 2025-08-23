import { useState, useCallback, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  content: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
  type: 'text' | 'system' | 'file';
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: string[];
  sendMessage: (content: string) => void;
  joinChat: (sessionId: string, userId: string, userName: string) => void;
  leaveChat: () => void;
  markAsTyping: () => void;
  stopTyping: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const sendMessage = useCallback((content: string) => {
    if (!currentUser || !content.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: {
        id: currentUser.id,
        name: currentUser.name
      },
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);

    // Dans un vrai projet, envoyer via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        data: message
      }));
    }
  }, [currentUser]);

  const joinChat = useCallback((sessionId: string, userId: string, userName: string) => {
    setCurrentUser({ id: userId, name: userName });
    setIsConnected(true);

    // Simuler des messages existants
    const existingMessages: ChatMessage[] = [
      {
        id: '1',
        content: 'Bienvenue dans la session de collaboration !',
        sender: { id: 'system', name: 'Système' },
        timestamp: new Date(Date.now() - 300000),
        type: 'system'
      },
      {
        id: '2',
        content: 'Salut tout le monde ! Prêt pour réviser ensemble ?',
        sender: { id: 'alice', name: 'Alice Smith' },
        timestamp: new Date(Date.now() - 120000),
        type: 'text'
      },
      {
        id: '3',
        content: 'Oui ! J\'ai préparé mes notes sur le machine learning',
        sender: { id: 'bob', name: 'Bob Johnson' },
        timestamp: new Date(Date.now() - 60000),
        type: 'text'
      }
    ];

    setMessages(existingMessages);

    // Simuler l'arrivée de nouveaux messages
    setTimeout(() => {
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `${userName} a rejoint la session`,
        sender: { id: 'system', name: 'Système' },
        timestamp: new Date(),
        type: 'system'
      };
      setMessages(prev => [...prev, welcomeMessage]);
    }, 1000);

    // Dans un vrai projet, établir une connexion WebSocket
    // wsRef.current = new WebSocket(`ws://localhost:3001/chat/${sessionId}`);
  }, []);

  const leaveChat = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setMessages([]);
    setIsConnected(false);
    setIsTyping([]);
    setCurrentUser(null);
  }, []);

  const markAsTyping = useCallback(() => {
    if (!currentUser) return;

    // Dans un vrai projet, envoyer via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        data: { userId: currentUser.id, userName: currentUser.name }
      }));
    }

    // Arrêter automatiquement après 3 secondes
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentUser]);

  const stopTyping = useCallback(() => {
    if (!currentUser) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Dans un vrai projet, envoyer via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_typing',
        data: { userId: currentUser.id }
      }));
    }
  }, [currentUser]);

  // Simuler des utilisateurs qui tapent
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        const shouldShowTyping = Math.random() > 0.8;
        if (shouldShowTyping) {
          setIsTyping(['Alice Smith']);
          setTimeout(() => setIsTyping([]), 2000);
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isConnected]);

  return {
    messages,
    isConnected,
    isTyping,
    sendMessage,
    joinChat,
    leaveChat,
    markAsTyping,
    stopTyping
  };
}