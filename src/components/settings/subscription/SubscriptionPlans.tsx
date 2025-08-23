import React, { useState } from 'react';
import {
  Crown,
  Check,
  CreditCard,
  ExternalLink,
  AlertCircle,
  Loader,
  Star,
  Zap,
  Shield,
  Users,
  Sparkles,
  ArrowRight,
  X,
  BookOpen,
  Brain,
  BarChart3
} from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { supabase } from '../../../lib/supabase';

export function SubscriptionPlans() {
  const { state } = useApp();
  const { user, darkMode } = state;
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Configuration des 3 plans
  const plans = [
    {
      id: 'gratuit',
      name: 'Gratuit',
      subtitle: 'Parfait pour commencer',
      price: { monthly: 0, yearly: 0 },
      priceId: { monthly: 'free', yearly: 'free' },
      popular: false,
      icon: BookOpen,
      iconColor: 'from-gray-500 to-gray-600',
      features: [
        'Jusqu\'à 100 notes',
        'Flashcards basiques',
        'Stockage 1 GB',
        'Support communautaire'
      ],
      buttonText: 'Commencer gratuitement',
      buttonStyle: 'secondary' as const
    },
    {
      id: 'pro',
      name: 'Pro',
      subtitle: 'Pour les utilisateurs avancés',
      price: { monthly: 9, yearly: 89 },
      priceId: { monthly: 'price_1Rbo6rLalEotrAUvDy2s3aub', yearly: 'price_pro_yearly' },
      popular: true,
      icon: Brain,
      iconColor: 'from-blue-500 to-indigo-600',
      features: [
        'Notes illimitées',
        'IA & Assistant GPT-4o',
        'Collaboration Zoom',
        'Stockage 50 GB',
        'Support prioritaire'
      ],
      buttonText: 'Choisir Pro',
      buttonStyle: 'primary' as const
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Pour les équipes et organisations',
      price: { monthly: 29, yearly: 289 },
      priceId: { monthly: 'price_1Rbo7aLalEotrAUvy17PgJT2', yearly: 'price_enterprise_yearly' },
      popular: false,
      icon: BarChart3,
      iconColor: 'from-green-500 to-emerald-600',
      features: [
        'Tout de Pro +',
        'Équipes illimitées',
        'Analytics avancés',
        'Stockage 500 GB',
        'Support dédié 24/7'
      ],
      buttonText: 'Choisir Enterprise',
      buttonStyle: 'primary' as const
    }
  ];

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Gérer la souscription
  const handleSubscribe = async (plan: typeof plans[0]) => {
    if (!user) {
      showMessage('error', 'Vous devez être connecté pour souscrire');
      return;
    }

    if (plan.id === 'gratuit') {
      showMessage('success', 'Vous utilisez déjà le plan gratuit !');
      return;
    }

    if (plan.id === 'enterprise') {
      // Pour le plan entreprise, rediriger vers Stripe comme les autres plans
      // (pas de traitement spécial)
    }

    const priceId = billingCycle === 'yearly' ? plan.priceId.yearly : plan.priceId.monthly;
    setLoadingPriceId(priceId);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceId,
          success_url: `${window.location.origin}/settings?success=true`,
          cancel_url: `${window.location.origin}/settings?canceled=true`,
          mode: 'subscription'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Aucune URL de paiement reçue');
      }
    } catch (error) {
      console.error('Erreur lors de la redirection:', error);
      showMessage('error', error instanceof Error ? error.message : 'Erreur lors de la souscription');
    } finally {
      setLoadingPriceId(null);
      setIsLoading(false);
    }
  };

  const getCurrentPlan = () => {
    if (user?.subscription === 'free') return 'gratuit';
    if (user?.subscription === 'basic') return 'pro';
    if (user?.subscription === 'premium') return 'enterprise';
    return 'gratuit';
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratuit';
    return `${price}€`;
  };

  const getYearlyEquivalent = (yearlyPrice: number) => {
    if (yearlyPrice === 0) return null;
    return Math.round(yearlyPrice / 12 * 100) / 100;
  };

  const PricingCard = ({ plan }: { plan: typeof plans[0] }) => {
    const isCurrentPlan = getCurrentPlan() === plan.id;
    const currentPrice = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
    const yearlyEquivalent = billingCycle === 'yearly' ? getYearlyEquivalent(plan.price.yearly) : null;
    const currentPriceId = billingCycle === 'yearly' ? plan.priceId.yearly : plan.priceId.monthly;
    const Icon = plan.icon;

    return (
      <div className={`
        relative rounded-2xl border-2 transition-all duration-300 hover:scale-105 h-full
        ${plan.popular 
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-xl scale-105'
          : isCurrentPlan
            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
            : darkMode 
              ? 'border-gray-700 bg-gray-800 hover:border-gray-600' 
              : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}>
        {/* Badge populaire */}
        {plan.popular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-1 shadow-lg">
              <Star className="w-4 h-4 fill-current" />
              <span>Populaire</span>
            </div>
          </div>
        )}

        {/* Badge plan actuel */}
        {isCurrentPlan && (
          <div className="absolute -top-4 right-4 z-10">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
              <Crown className="w-3 h-3" />
              <span>Actuel</span>
            </div>
          </div>
        )}

        <div className="p-8 h-full flex flex-col">
          {/* Header avec icône */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 bg-gradient-to-br ${plan.iconColor} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {plan.name}
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {plan.subtitle}
            </p>
          </div>

          {/* Prix */}
          <div className="text-center mb-8">
            {currentPrice === 0 ? (
              <div className={`text-5xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Gratuit
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-center space-x-1 mb-2">
                  <span className={`text-5xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatPrice(currentPrice)}
                  </span>
                  <span className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {billingCycle === 'yearly' ? '/an' : '/mois'}
                  </span>
                </div>
                {billingCycle === 'yearly' && yearlyEquivalent && (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    Soit {yearlyEquivalent}€/mois
                  </p>
                )}
                {billingCycle === 'yearly' && currentPrice > 0 && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Économisez 17%
                    </span>
                  </div>
                )}
              </>
            )}
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              {billingCycle === 'yearly' ? 'Facturation annuelle' : 'Facturation mensuelle'}
            </p>
          </div>

          {/* Fonctionnalités */}
          <div className="space-y-4 mb-8 flex-1">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Bouton d'action */}
          <div className="mt-auto">
            {isCurrentPlan ? (
              <div className="space-y-3">
                <button
                  disabled
                  className={`
                    w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200
                    ${darkMode 
                      ? 'bg-green-900/30 text-green-400 border-2 border-green-800'
                      : 'bg-green-100 text-green-800 border-2 border-green-200'
                    }
                  `}
                >
                  Plan actuel
                </button>
                {currentPrice > 0 && (
                  <button
                    onClick={() => {}}
                    disabled={isLoading}
                    className={`
                      w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 text-sm
                      ${darkMode 
                        ? 'text-blue-400 hover:bg-blue-900/20 border border-blue-800'
                        : 'text-blue-600 hover:bg-blue-50 border border-blue-200'
                      }
                    `}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Gérer l'abonnement</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={loadingPriceId === currentPriceId}
                className={`
                  w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-2
                  ${plan.buttonStyle === 'primary'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-xl hover:scale-105 border-2 border-transparent'
                    : plan.buttonStyle === 'enterprise'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:scale-105 border-2 border-transparent'
                      : darkMode
                        ? 'border-2 border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700'
                        : 'border-2 border-gray-300 text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }
                  ${loadingPriceId === currentPriceId ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {loadingPriceId === currentPriceId ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Redirection...</span>
                  </>
                ) : (
                  <>
                    <span>{plan.buttonText}</span>
                    {plan.id !== 'gratuit' && <ArrowRight className="w-5 h-5" />}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Message de notification */}
      {message && (
        <div className={`
          fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center space-x-3 animate-slide-down
          ${message.type === 'success' 
            ? darkMode 
              ? 'bg-green-800 text-green-200 border border-green-700' 
              : 'bg-green-100 text-green-800 border border-green-200'
            : darkMode 
              ? 'bg-red-800 text-red-200 border border-red-700' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }
        `}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="font-medium">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-2 p-1 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h2 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Plans tarifaires
        </h2>
        <p className={`text-xl mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Choisissez le plan qui correspond à vos besoins
        </p>
        
        {/* Sélecteur de cycle de facturation */}
        <div className="flex items-center justify-center mb-12">
          <div className={`
            flex p-1 rounded-xl border-2
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}
          `}>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`
                px-8 py-3 rounded-lg font-bold transition-all duration-200
                ${billingCycle === 'monthly'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`
                px-8 py-3 rounded-lg font-bold transition-all duration-200 relative
                ${billingCycle === 'yearly'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              Annuel
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                -17%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grille des 3 forfaits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => (
          <PricingCard key={plan.id} plan={plan} />
        ))}
      </div>

      {/* Section FAQ */}
      <div className={`
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        border-2 rounded-2xl p-8
      `}>
        <h3 className={`text-2xl font-bold text-center mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Questions fréquentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Puis-je changer de forfait à tout moment ?
            </h4>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Oui, vous pouvez passer à un forfait supérieur ou inférieur à tout moment. Les changements prennent effet immédiatement.
            </p>
          </div>
          <div>
            <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Y a-t-il une période d'essai gratuite ?
            </h4>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Le forfait Gratuit est disponible à vie. Les forfaits payants offrent 14 jours d'essai gratuit.
            </p>
          </div>
          <div>
            <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Comment annuler mon abonnement ?
            </h4>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Vous pouvez annuler à tout moment via le portail de gestion. Votre accès reste actif jusqu'à la fin de la période payée.
            </p>
          </div>
          <div>
            <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Acceptez-vous les paiements par virement ?
            </h4>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Pour les forfaits Enterprise, nous acceptons les virements bancaires et les bons de commande.
            </p>
          </div>
        </div>
      </div>

      {/* Garantie */}
      <div className="text-center">
        <div className={`inline-flex items-center space-x-3 px-6 py-3 rounded-full ${darkMode ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-green-100 text-green-800 border border-green-200'}`}>
          <Shield className="w-5 h-5" />
          <span className="font-bold">Garantie satisfait ou remboursé 30 jours</span>
        </div>
      </div>
    </div>
  );
}