import React from 'react';
import { FileText, Mail, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsOfService() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Retour à la page précédente
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bouton de retour */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Retour</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Conditions d'utilisation
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Les règles d'utilisation de Centrinote
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Acceptation des conditions
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              En utilisant Centrinote, vous acceptez ces conditions d'utilisation dans leur intégralité. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. Description du service
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Centrinote est une plateforme SaaS de gestion des connaissances qui permet aux utilisateurs de créer, organiser et partager du contenu éducatif et professionnel.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Compte utilisateur
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Vous devez créer un compte pour utiliser nos services</li>
              <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
              <li>Vous devez nous notifier immédiatement de tout usage non autorisé</li>
              <li>Un seul compte par utilisateur est autorisé</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Utilisation acceptable
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Vous vous engagez à ne pas :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Violer les lois applicables</li>
              <li>Publier du contenu offensant, illégal ou diffamatoire</li>
              <li>Perturber le fonctionnement du service</li>
              <li>Accéder de manière non autorisée aux comptes d'autres utilisateurs</li>
              <li>Utiliser le service à des fins commerciales sans autorisation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Propriété intellectuelle
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Vous conservez la propriété de votre contenu. En utilisant Centrinote, vous nous accordez une licence pour stocker, traiter et afficher votre contenu dans le cadre du service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Facturation et annulation
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Les abonnements payants sont facturés de manière récurrente</li>
              <li>Vous pouvez annuler votre abonnement à tout moment</li>
              <li>Les remboursements sont traités au cas par cas</li>
              <li>Les prix peuvent être modifiés avec un préavis de 30 jours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              7. Limitation de responsabilité
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Centrinote est fourni "en l'état". Nous ne garantissons pas l'absence d'interruptions ou d'erreurs, et notre responsabilité est limitée au montant payé pour le service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              8. Modification des conditions
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications importantes seront communiquées par email avec un préavis de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              9. Contact
            </h2>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Pour toute question concernant ces conditions :
              </p>
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400">
                <Mail className="w-5 h-5" />
                <span className="font-medium">contact@centrinote.fr</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mt-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Dernière mise à jour : 15 janvier 2025</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}