import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader,
  Crown,
  Shield,
  Zap,
  BarChart,
  Users,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { supabase } from '../../../lib/supabase';

interface SubscriptionOverviewProps {
  onUpgrade: () => void;
}

interface SubscriptionData {
  id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  price_id: string;
  payment_method_brand?: string;
  payment_method_last4?: string;
}

export function SubscriptionOverview({ onUpgrade }: SubscriptionOverviewProps) {
  const { state } = useApp();
  const { user, darkMode } = state;
  
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les informations d'abonnement
  useEffect(() => {
    const loadSubscriptionInfo = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Récupérer les informations d'abonnement depuis Supabase
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }
        
        if (data) {
          setSubscription({
            id: data.subscription_id || '',
            status: data.subscription_status || 'active',
            current_period_start: data.current_period_start || Math.floor(Date.now() / 1000) - 15 * 24 * 60 * 60,
            current_period_end: data.current_period_end || Math.floor(Date.now() / 1000) + 15 * 24 * 60 * 60,
            cancel_at_period_end: data.cancel_at_period_end || false,
            price_id: data.price_id || '',
            payment_method_brand: data.payment_method_brand,
            payment_method_last4: data.payment_method_last4
          });
        } else {
          setSubscription(null);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'abonnement:', err);
        setError('Impossible de charger les informations d\'abonnement');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscriptionInfo();
  }, [user]);

  // Gérer le portail client
  const handleManageSubscription = async () => {
    if (!user) return;

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-customer-portal', {
        body: {
          returnUrl: window.location.href
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Aucune URL de portail reçue');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du portail:', error);
      setError('Impossible d\'ouvrir le portail de gestion');
    } finally {
      setIsLoading(false);
    }
  };

  // Formater la date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Calculer les jours restants
  const getRemainingDays = (endTimestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diffSeconds = endTimestamp - now;
    return Math.max(0, Math.floor(diffSeconds / (60 * 60 * 24)));
  };

  // Obtenir les fonctionnalités du plan actuel
  const getCurrentPlanFeatures = () => {
    switch (user?.subscription) {
      case 'premium':
        return [
          { icon: Sparkles, text: 'IA avancée (GPT-4o)', color: 'text-purple-500' },
          { icon: Zap, text: 'Stockage illimité', color: 'text-yellow-500' },
          { icon: Users, text: 'Collaboration illimitée', color: 'text-blue-500' },
          { icon: Shield, text: 'Support 24/7', color: 'text-green-500' },
          { icon: BarChart, text: 'Analyses avancées', color: 'text-indigo-500' }
        ];
      case 'basic':
        return [
          { icon: Zap, text: '50GB de stockage', color: 'text-yellow-500' },
          { icon: Users, text: 'Collaboration avancée', color: 'text-blue-500' },
          { icon: Shield, text: 'Support prioritaire', color: 'text-green-500' }
        ];
      default:
        return [
          { icon: Zap, text: '5GB de stockage', color: 'text-yellow-500' },
          { icon: Users, text: 'Collaboration basique', color: 'text-blue-500' }
        ];
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Chargement des informations d'abonnement...
          </p>
        </div>
      </div>
    );
  }

  const features = getCurrentPlanFeatures();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Message d'erreur */}
      {error && (
        <div className={`
          p-4 rounded-xl border flex items-center space-x-3
          ${darkMode 
            ? 'bg-red-900/20 border-red-800 text-red-400' 
            : 'bg-red-50 border-red-200 text-red-800'
          }
        `}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Carte d'abonnement */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border rounded-2xl overflow-hidden
      `}>
        {/* Header de la carte */}
        <div className={`
          ${user?.subscription === 'premium'
            ? 'bg-gradient-to-r from-purple-500 to-pink-500'
            : user?.subscription === 'basic'
              ? 'bg-gradient-to-r from-blue-500 to-teal-500'
              : 'bg-gradient-to-r from-gray-500 to-gray-600'
          }
          p-6 text-white
        `}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-1">
                Plan {user?.subscription === 'free' ? 'Gratuit' : user?.subscription === 'basic' ? 'Pro' : 'Premium'}
              </h3>
              <p className="text-white/80">
                {user?.subscription === 'free' 
                  ? 'Fonctionnalités de base' 
                  : subscription?.status === 'active'
                    ? 'Abonnement actif'
                    : 'Statut: ' + subscription?.status
                }
              </p>
            </div>
            {user?.subscription !== 'free' && subscription && (
              <div className="text-right">
                <div className="text-sm text-white/80">Prochain renouvellement</div>
                <div className="flex items-center space-x-2 text-white font-medium">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(subscription.current_period_end)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Contenu de la carte */}
        <div className="p-6">
          {/* Statut de l'abonnement */}
          {user?.subscription !== 'free' && subscription && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    subscription.status === 'active' 
                      ? 'bg-green-500' 
                      : subscription.status === 'past_due'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}></div>
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {subscription.status === 'active' 
                      ? 'Abonnement actif' 
                      : subscription.status === 'past_due'
                        ? 'Paiement en retard'
                        : 'Abonnement inactif'
                    }
                  </span>
                </div>
                
                {subscription.cancel_at_period_end && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs">
                    <Clock className="w-3 h-3" />
                    <span>Se termine le {formatDate(subscription.current_period_end)}</span>
                  </div>
                )}
              </div>

              {/* Barre de progression */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Période en cours
                  </span>
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {getRemainingDays(subscription.current_period_end)} jours restants
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      user?.subscription === 'premium'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                        : 'bg-gradient-to-r from-blue-500 to-teal-500'
                    }`}
                    style={{ 
                      width: `${100 - (getRemainingDays(subscription.current_period_end) / 
                        ((subscription.current_period_end - subscription.current_period_start) / 86400) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Fonctionnalités incluses */}
          <div className="mb-6">
            <h4 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Fonctionnalités incluses
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${feature.color}`} />
                    </div>
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {feature.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {user?.subscription === 'free' ? (
              <button
                onClick={onUpgrade}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
              >
                <Crown className="w-5 h-5" />
                <span>Passer à un forfait payant</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                  className={`
                    flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200
                    ${darkMode 
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }
                    ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>Gérer l'abonnement</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onUpgrade}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Changer de forfait</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Informations supplémentaires */}
      {user?.subscription !== 'free' && (
        <div className={`
          ${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}
          border rounded-xl p-6
        `}>
          <div className="flex items-start space-x-3">
            <CheckCircle className={`w-5 h-5 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
                Besoin d'aide avec votre abonnement ?
              </h4>
              <p className={`text-sm mb-4 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Notre équipe de support est disponible pour vous aider avec toute question concernant votre abonnement.
              </p>
              <button className={`
                inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium
                ${darkMode 
                  ? 'bg-blue-800/50 text-blue-300 hover:bg-blue-800/70'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }
                transition-colors
              `}>
                <ExternalLink className="w-4 h-4" />
                <span>Contacter le support</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}