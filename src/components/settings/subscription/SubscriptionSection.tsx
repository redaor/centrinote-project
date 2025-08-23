import React, { useState } from 'react';
import { Crown } from 'lucide-react';
import { SubscriptionPlans } from './SubscriptionPlans';
import { SubscriptionOverview } from './SubscriptionOverview';

interface SubscriptionSectionProps {
  darkMode: boolean;
}

export function SubscriptionSection({ darkMode }: SubscriptionSectionProps) {
  const [view, setView] = useState<'overview' | 'plans'>('overview');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Abonnement
        </h2>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Gérez votre abonnement et découvrez nos forfaits
        </p>
      </div>

      {/* Contenu */}
      {view === 'overview' ? (
        <SubscriptionOverview onUpgrade={() => setView('plans')} />
      ) : (
        <SubscriptionPlans />
      )}
    </div>
  );
}