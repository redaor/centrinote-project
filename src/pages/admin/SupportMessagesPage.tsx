import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Calendar, MessageSquare, RefreshCw, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { ErrorLogsDashboard } from '../../components/admin/ErrorLogsDashboard';
import { logger } from '../../utils/logger';

interface SupportMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'nouveau' | 'en_cours' | 'resolu' | 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  source?: string;
  escalated?: boolean;
  priority?: string;
}

export function SupportMessagesPage() {
  const { state } = useApp();
  const { darkMode, user } = state;
  const navigate = useNavigate();

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'support' | 'logs'>('support');

  // Vérifier si l'utilisateur est admin
  const isAdmin =
    user?.email === 'contact@centrinote.fr' ||
    user?.email === 'reda_sahraoui@outlook.fr' ||
    user?.role === 'admin';

  // Rediriger les non-admins
  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  // Charger les messages
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[SupportMessagesPage] Loading messages, user:', user?.email);
      console.log('[SupportMessagesPage] Is admin:', isAdmin);

      // Charger depuis support_messages (table principale qui fonctionne)
      const { data: messages, error: messagesError } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('[SupportMessagesPage] Messages loaded:', messages?.length || 0);
      console.log('[SupportMessagesPage] Messages error:', messagesError);

      if (messagesError) {
        console.error('[SupportMessagesPage] Error loading messages:', messagesError);
        logger.error('Erreur lors du chargement des messages', messagesError);
      }

      // Ne plus essayer de charger support_tickets (causait des erreurs 403)
      // On utilise uniquement support_messages qui fonctionne

      if (messagesError && messagesError.code !== 'PGRST116') {
        // PGRST116 = table n'existe pas, on ignore
        console.warn('[SupportMessagesPage] Error loading messages (table may not exist):', messagesError);
      }

      // Combiner et transformer les données
      const allMessages: SupportMessage[] = [];

      // Ajouter les messages de support_messages (table principale)
      if (messages && !messagesError) {
        console.log('[SupportMessagesPage] Processing', messages.length, 'messages');
        if (messages.length > 0) {
          console.log('[SupportMessagesPage] Sample message:', {
            id: messages[0].id,
            subject: messages[0].subject,
            email: messages[0].email,
            status: messages[0].status,
            created_at: messages[0].created_at
          });
        }
        messages.forEach(msg => {
          allMessages.push({
            id: msg.id,
            name: msg.name || 'Utilisateur',
            email: msg.email,
            subject: msg.subject || 'Sans sujet',
            message: msg.message,
            status: msg.status,
            created_at: msg.created_at,
            updated_at: msg.updated_at || msg.created_at
          });
        });
      } else if (messagesError) {
        console.error('[SupportMessagesPage] Error details:', {
          code: messagesError.code,
          message: messagesError.message,
          details: messagesError.details,
          hint: messagesError.hint
        });
        setError(`Erreur lors du chargement: ${messagesError.message || 'Erreur inconnue'}`);
      } else if (!messages || messages.length === 0) {
        console.log('[SupportMessagesPage] No messages found. User:', user?.email, 'Is admin:', isAdmin);
      }

      // Trier par date de création (plus récent en premier)
      allMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('[SupportMessagesPage] Total messages:', allMessages.length);
      setMessages(allMessages);
    } catch (err) {
      console.error('[SupportMessagesPage] Exception:', err);
      logger.error('Erreur lors du chargement des messages', err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: 'nouveau' | 'en_cours' | 'resolu') => {
    try {
      // Mettre à jour dans support_messages (table principale)
      const { error: messageError } = await supabase
        .from('support_messages')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      // Si ce n'est pas dans support_messages, essayer support_tickets
      if (messageError) {
        const ticketStatus = 
          newStatus === 'nouveau' ? 'open' :
          newStatus === 'en_cours' ? 'in_progress' :
          'resolved';

        const { error: ticketError } = await supabase
          .from('support_tickets')
          .update({ 
            status: ticketStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (ticketError) {
          throw ticketError;
        }
      }

      // Mettre à jour localement
      setMessages(prev =>
        prev.map(msg => (msg.id === id ? { ...msg, status: newStatus } : msg))
      );
    } catch (err) {
      logger.error('Erreur lors de la mise à jour du statut', err instanceof Error ? err : new Error(String(err)));
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.')) {
      return;
    }

    try {
      // Supprimer dans support_messages (table principale)
      const { data, error: messageDeleteError } = await supabase
        .from('support_messages')
        .delete()
        .eq('id', id)
        .select();

      // Si ce n'est pas dans support_messages, essayer support_tickets
      if (messageDeleteError) {
        const { error: ticketDeleteError } = await supabase
          .from('support_tickets')
          .delete()
          .eq('id', id);

        if (ticketDeleteError) {
          throw ticketDeleteError;
        }
      } else {
        // Vérifier que la suppression a bien fonctionné
        if (!data || data.length === 0) {
          logger.warn('Aucun message supprimé', { messageId: id });
          alert('Le message n\'a pas pu être supprimé. Vérifiez vos permissions.');
          return;
        }
      }

      // Mettre à jour localement
      setMessages(prev => prev.filter(msg => msg.id !== id));
      logger.info('Message de support supprimé avec succès', { messageId: id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      logger.error('Erreur lors de la suppression du message', err instanceof Error ? err : new Error(String(err)), {
        messageId: id,
      });
      alert(`Erreur lors de la suppression du message: ${errorMessage}`);
    }
  };

  const filteredMessages =
    selectedStatus === 'all'
      ? messages
      : messages.filter(msg => msg.status === selectedStatus);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nouveau':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Clock className="w-3 h-3 mr-1" />
            Nouveau
          </span>
        );
      case 'en_cours':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <RefreshCw className="w-3 h-3 mr-1" />
            En cours
          </span>
        );
      case 'resolu':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Résolu
          </span>
        );
      default:
        return null;
    }
  };

  if (!isAdmin) {
    return null; // Sera redirigé par useEffect
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        {/* Onglets */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'support'
                ? 'bg-purple-500 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Messages Support
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'logs'
                ? 'bg-purple-500 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Logs d'erreurs
          </button>
        </div>
      </div>

      {/* Contenu selon l'onglet actif */}
      {activeTab === 'logs' ? (
        <ErrorLogsDashboard userId={user?.id} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              👨‍💼 Administration
            </h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Gestion des messages de support
            </p>
          </div>
        </div>

        <button
          onClick={loadMessages}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {messages.length}
              </p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Nouveaux
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {messages.filter(m => m.status === 'nouveau').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                En cours
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {messages.filter(m => m.status === 'en_cours').length}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Résolus
              </p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {messages.filter(m => m.status === 'resolu').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {['all', 'nouveau', 'en_cours', 'resolu'].map(status => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${selectedStatus === status
                ? 'bg-purple-500 text-white shadow-md'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {status === 'all' ? 'Tous' : status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div className={`p-4 rounded-lg border ${
          darkMode 
            ? 'bg-red-900/30 border-red-700 text-red-300' 
            : 'bg-red-100 border-red-300 text-red-700'
        }`}>
          <p className="font-semibold mb-2">Erreur lors du chargement :</p>
          <p className="mb-2">{error}</p>
          <button
            onClick={loadMessages}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              darkMode
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Réessayer
          </button>
        </div>
      )}

      {filteredMessages.length === 0 && !error && !loading ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Aucun message {selectedStatus !== 'all' ? `avec le statut "${selectedStatus}"` : ''}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map(msg => (
            <div
              key={msg.id}
              className={`
                p-6 rounded-lg border transition-all
                ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                hover:shadow-lg
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {msg.subject}
                    </h3>
                    {getStatusBadge(msg.status)}
                  </div>

                  <div className="flex items-center space-x-4 text-sm flex-wrap gap-2">
                    <div className="flex items-center space-x-1">
                      <Mail className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                        {msg.name} ({msg.email})
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                    {msg.source && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        msg.source === 'chatbot' 
                          ? darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                          : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {msg.source === 'chatbot' ? '🤖 Chatbot' : msg.source}
                      </span>
                    )}
                    {msg.escalated && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-800'
                      }`}>
                        ⚡ Escaladé
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {msg.status !== 'en_cours' && (
                    <button
                      onClick={() => updateStatus(msg.id, 'en_cours')}
                      className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors dark:bg-yellow-900/30 dark:text-yellow-400"
                    >
                      Marquer en cours
                    </button>
                  )}
                  {msg.status !== 'resolu' && (
                    <button
                      onClick={() => updateStatus(msg.id, 'resolu')}
                      className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors dark:bg-green-900/30 dark:text-green-400"
                    >
                      Marquer résolu
                    </button>
                  )}
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors dark:bg-red-900/30 dark:text-red-400 flex items-center gap-1"
                    title="Supprimer le message"
                  >
                    <XCircle className="w-3 h-3" />
                    Supprimer
                  </button>
                </div>
              </div>

              <div className={`
                p-4 rounded-lg
                ${darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}
              `}>
                <p className={`whitespace-pre-wrap ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {msg.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}
