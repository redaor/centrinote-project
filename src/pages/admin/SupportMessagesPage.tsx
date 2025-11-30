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
  status: 'nouveau' | 'en_cours' | 'resolu';
  created_at: string;
  updated_at: string;
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

      const { data, error: fetchError } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setMessages(data || []);
    } catch (err) {
      logger.error('Erreur lors du chargement des messages', err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: 'nouveau' | 'en_cours' | 'resolu') => {
    try {
      const { error: updateError } = await supabase
        .from('support_messages')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) {
        throw updateError;
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
      // Vérifier que le message existe avant de le supprimer
      const { data: existingMessage, error: checkError } = await supabase
        .from('support_messages')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingMessage) {
        throw new Error('Message introuvable');
      }

      // Supprimer le message avec une clause WHERE (requis par PostgREST)
      const { data, error: deleteError } = await supabase
        .from('support_messages')
        .delete()
        .eq('id', id)
        .select(); // Retourner les données supprimées pour vérification

      if (deleteError) {
        logger.error('Erreur DELETE support_messages', new Error(deleteError.message), {
          code: deleteError.code,
          details: deleteError.details,
          hint: deleteError.hint,
          messageId: id,
        });
        throw new Error(deleteError.message || 'Erreur lors de la suppression');
      }

      // Vérifier que la suppression a bien fonctionné
      if (!data || data.length === 0) {
        logger.warn('Aucun message supprimé', { messageId: id });
        alert('Le message n\'a pas pu être supprimé. Vérifiez vos permissions.');
        return;
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
        <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
          Erreur : {error}
        </div>
      )}

      {filteredMessages.length === 0 ? (
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

                  <div className="flex items-center space-x-4 text-sm">
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
