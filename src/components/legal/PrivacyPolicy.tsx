import React from 'react';
import { Shield, Mail, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicy() {
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
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Politique de confidentialité
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Comment nous protégeons et utilisons vos données
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Collecte des données
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Centrinote collecte uniquement les données nécessaires au fonctionnement du service :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Informations de compte (email, mot de passe chiffré)</li>
              <li>Contenu créé par l'utilisateur (notes, documents)</li>
              <li>Données d'usage pour améliorer le service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. Utilisation des données
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Vos données sont utilisées exclusivement pour :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Fournir et améliorer nos services</li>
              <li>Assurer la sécurité de votre compte</li>
              <li>Vous contacter concernant le service (si nécessaire)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Partage des données
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Centrinote ne vend, ne loue ni ne partage vos données personnelles avec des tiers, sauf :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Avec votre consentement explicite</li>
              <li>Pour respecter nos obligations légales</li>
              <li>Avec nos partenaires techniques (Zoom) dans le cadre de l'intégration</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. Sécurité
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Nous mettons en œuvre des mesures de sécurité avancées pour protéger vos données, incluant le chiffrement, l'authentification sécurisée et des audits réguliers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Vos droits
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Accès à vos données</li>
              <li>Rectification des données inexactes</li>
              <li>Suppression de vos données</li>
              <li>Portabilité de vos données</li>
              <li>Opposition au traitement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Contact
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Pour toute question concernant cette politique de confidentialité, contactez-nous à :
              </p>
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
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