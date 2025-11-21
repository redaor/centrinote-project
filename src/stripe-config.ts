// Centrinote Stripe Product Configuration

export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'subscription';
  features: string[];
  price: number;
  currency: string;
}

// Stripe product configuration
export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_SWrpAtx4rldSpD',
    priceId: 'price_1Rbo5uLalEotrAUvbBwwtrZu',
    name: 'Essentiel',
    description: 'Accès aux fonctionnalités de base pour la prise de notes et l\'organisation personnelle. • Stockage limité et usage individuel. • Support communautaire. • Parfait pour les étudiants, les indépendants ou toute personne souhaitant tester l\'application à son rythme.',
    mode: 'subscription',
    features: [
      'Stockage limité (5GB)',
      'Usage individuel',
      'Support communautaire',
      'Fonctionnalités de base'
    ],
    price: 0,
    currency: 'EUR'
  },
  {
    id: 'prod_SWrqxCSId3Z8hB',
    priceId: 'price_1Rbo6rLalEotrAUvDy2s3aub',
    name: 'Pro',
    description: 'Pensé pour les utilisateurs exigeants ou les petites équipes. • Toutes les fonctionnalités de l\'offre Essentiel, plus : • Collaboration en temps réel et partage de documents. • Stockage augmenté. • Accès aux fonctionnalités avancées (recherche intelligente, IA, intégrations tierces). • Support prioritaire par email. • Idéal pour les professionnels, enseignants, ou équipes en croissance.',
    mode: 'subscription',
    features: [
      'Toutes les fonctionnalités Essentiel',
      'Collaboration en temps réel',
      'Partage de documents',
      'Stockage augmenté (50GB)',
      'Recherche intelligente',
      'Intégrations IA avancées',
      'Support prioritaire'
    ],
    price: 900,
    currency: 'EUR'
  },
  {
    id: 'prod_SWrrp2tS03WXUn',
    priceId: 'price_1Rbo7aLalEotrAUvy17PgJT2',
    name: 'Entreprise',
    description: 'La solution complète pour les organisations et groupes avancés. • Toutes les fonctionnalités du plan Pro, plus : • Stockage illimité. • Gestion d\'équipe et administration centralisée. • Contrôles de sécurité renforcés et conformité. • Support dédié et accompagnement personnalisé. • Intégrations avancées (API, SSO, etc.). • Parfait pour les entreprises, écoles, ou structures ayant des besoins évolutifs et exigeants.',
    mode: 'subscription',
    features: [
      'Toutes les fonctionnalités Pro',
      'Stockage illimité',
      'Gestion d\'équipe',
      'Administration centralisée',
      'Sécurité renforcée',
      'Conformité RGPD',
      'Support dédié 24/7',
      'Intégrations API avancées',
      'SSO et authentification avancée'
    ],
    price: 2900,
    currency: 'EUR'
  }
];

// Helper function to get a product by ID
export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

// Helper function to get a product by price ID
export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}

// Helper function to format price
export function formatPrice(price: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0
  }).format(price / 100);
}