interface StripeProduct {
  id: string;
  name: string;
  description: string;
  features: string[];
  prices: {
    monthly: {
      id: string;
      amount: number;
      currency: string;
    };
    yearly: {
      id: string;
      amount: number;
      currency: string;
      discount: number;
    };
  };
  popular?: boolean;
  tier: 'free' | 'basic' | 'premium';
}

interface StripeCheckoutSession {
  id: string;
  url: string;
  customer_email?: string;
}

interface StripeSubscription {
  id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'past_due' | 'trialing';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  items: {
    price: {
      id: string;
      nickname?: string;
      recurring: {
        interval: 'month' | 'year';
      };
    };
  }[];
}

class StripeService {
  private baseUrl: string;
  private publishableKey: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!this.baseUrl) {
      console.warn('VITE_SUPABASE_URL non configuré');
    }
    if (!this.publishableKey) {
      console.warn('VITE_STRIPE_PUBLISHABLE_KEY non configuré');
    }
  }

  // Configuration des produits et prix (normalement récupérés depuis Stripe)
  getProducts(): StripeProduct[] {
    return [
      {
        id: 'free',
        name: 'Essentiel',
        description: 'Parfait pour commencer',
        tier: 'free',
        features: [
          '5 documents maximum',
          '100 mots de vocabulaire',
          'Collaboration basique',
          'Support communautaire',
          '1GB de stockage'
        ],
        prices: {
          monthly: { id: 'free', amount: 0, currency: 'eur' },
          yearly: { id: 'free', amount: 0, currency: 'eur', discount: 0 }
        }
      },
      {
        id: 'prod_basic',
        name: 'Pro',
        description: 'Pour les utilisateurs avancés',
        tier: 'basic',
        popular: true,
        features: [
          'Documents illimités',
          'Vocabulaire illimité',
          'IA avancée (GPT-4o)',
          'Collaboration en temps réel',
          'Sessions vidéo Jitsi',
          'Export/Import de données',
          'Support prioritaire',
          '50GB de stockage',
          'Analyses détaillées'
        ],
        prices: {
          monthly: { id: 'price_basic_monthly', amount: 1499, currency: 'eur' },
          yearly: { id: 'price_basic_yearly', amount: 14990, currency: 'eur', discount: 17 }
        }
      },
      {
        id: 'prod_premium',
        name: 'Entreprise',
        description: 'Pour les équipes et organisations',
        tier: 'premium',
        features: [
          'Tout du plan Pro',
          'Utilisateurs illimités',
          'SSO et authentification avancée',
          'API personnalisée',
          'Intégrations tierces',
          'Support dédié 24/7',
          'Stockage illimité',
          'Conformité RGPD avancée',
          'Rapports d\'équipe',
          'Formation personnalisée'
        ],
        prices: {
          monthly: { id: 'price_premium_monthly', amount: 4999, currency: 'eur' },
          yearly: { id: 'price_premium_yearly', amount: 49990, currency: 'eur', discount: 17 }
        }
      }
    ];
  }

  // Créer une session de checkout Stripe
  async createCheckoutSession(
    priceId: string, 
    userEmail: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!this.baseUrl) {
        throw new Error('Configuration Stripe manquante');
      }

      const functionUrl = `${this.baseUrl}/functions/v1/create-checkout-session`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          priceId,
          customerEmail: userEmail,
          successUrl: successUrl || `${window.location.origin}/settings`,
          cancelUrl: cancelUrl || `${window.location.origin}/settings`
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création de la session');
      }

      return {
        success: true,
        url: result.url
      };

    } catch (error) {
      console.error('Erreur création session checkout:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Créer un portail client Stripe
  async createCustomerPortal(
    customerId: string,
    returnUrl?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!this.baseUrl) {
        throw new Error('Configuration Stripe manquante');
      }

      const functionUrl = `${this.baseUrl}/functions/v1/create-customer-portal`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          customerId,
          returnUrl: returnUrl || window.location.origin
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création du portail');
      }

      return {
        success: true,
        url: result.url
      };

    } catch (error) {
      console.error('Erreur création portail client:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Récupérer les informations d'abonnement
  async getSubscriptionInfo(userId: string): Promise<{
    success: boolean;
    subscription?: StripeSubscription;
    error?: string;
  }> {
    try {
      if (!this.baseUrl) {
        throw new Error('Configuration Stripe manquante');
      }

      const functionUrl = `${this.baseUrl}/functions/v1/get-subscription`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ userId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la récupération de l\'abonnement');
      }

      return {
        success: true,
        subscription: result.subscription
      };

    } catch (error) {
      console.error('Erreur récupération abonnement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Formater le prix pour l'affichage
  formatPrice(amount: number, currency: string = 'eur'): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0
    }).format(amount / 100);
  }

  // Calculer le prix avec remise annuelle
  calculateYearlyPrice(monthlyAmount: number, discount: number): number {
    const yearlyAmount = monthlyAmount * 12;
    return yearlyAmount - (yearlyAmount * discount / 100);
  }

  // Vérifier la configuration Stripe
  isConfigured(): boolean {
    return !!(this.baseUrl && this.publishableKey);
  }

  // Obtenir le statut de configuration
  getConfigurationStatus(): { configured: boolean; message: string } {
    if (!this.baseUrl) {
      return {
        configured: false,
        message: 'URL Supabase non configurée'
      };
    }
    
    if (!this.publishableKey) {
      return {
        configured: false,
        message: 'Clé publique Stripe non configurée'
      };
    }

    return {
      configured: true,
      message: 'Stripe configuré et prêt'
    };
  }

  // Rediriger vers Stripe Checkout
  async redirectToCheckout(priceId: string, userEmail: string): Promise<void> {
    const result = await this.createCheckoutSession(priceId, userEmail);
    
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      throw new Error(result.error || 'Impossible de créer la session de paiement');
    }
  }

  // Rediriger vers le portail client
  async redirectToCustomerPortal(customerId: string): Promise<void> {
    const result = await this.createCustomerPortal(customerId);
    
    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      throw new Error(result.error || 'Impossible d\'ouvrir le portail client');
    }
  }
}

// Instance singleton
export const stripeService = new StripeService();

// Export des types
export type { StripeProduct, StripeCheckoutSession, StripeSubscription };