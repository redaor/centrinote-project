import React from 'react';
import { Building, Mail, Calendar, Globe, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function LegalMentions() {
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
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Mentions légales
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Informations légales et réglementaires
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Éditeur du site
            </h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg space-y-2">
              <p className="text-gray-700 dark:text-gray-300"><strong>Raison sociale :</strong> Centrinote SAS</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Siège social :</strong> [Adresse à compléter]</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Forme juridique :</strong> Société par actions simplifiée</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Capital social :</strong> [Montant à compléter]</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>SIRET :</strong> [Numéro à compléter]</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>RCS :</strong> [Numéro à compléter]</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Code APE/NAF :</strong> 6201Z</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Numéro de TVA :</strong> [Numéro à compléter]</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Directeur de publication
            </h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg space-y-2">
              <p className="text-gray-700 dark:text-gray-300"><strong>Nom :</strong> [Nom du directeur de publication]</p>
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <Mail className="w-4 h-4" />
                <span>contact@centrinote.fr</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Hébergement
            </h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg space-y-2">
              <p className="text-gray-700 dark:text-gray-300"><strong>Hébergeur :</strong> Netlify Inc.</p>
              <p className="text-gray-700 dark:text-gray-300"><strong>Adresse :</strong> 2325 3rd Street, Suite 296, San Francisco, CA 94107, USA</p>
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <Globe className="w-4 h-4" />
                <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  https://www.netlify.com
                </a>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Protection des données personnelles
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mt-4">
              Pour exercer ces droits, contactez-nous à : <span className="text-blue-600 dark:text-blue-400 font-medium">contact@centrinote.fr</span>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Propriété intellectuelle
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Le site www.centrinote.fr et l'ensemble de son contenu (textes, images, vidéos, logos, etc.) sont protégés par le droit de la propriété intellectuelle. Toute reproduction, distribution, modification, adaptation, retransmission ou publication de ces différents éléments est strictement interdite sans l'accord exprès par écrit de Centrinote SAS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Cookies
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Ce site utilise des cookies essentiels au fonctionnement du service. Aucun cookie de tracking ou de publicité n'est utilisé. Vous pouvez paramétrer votre navigateur pour refuser les cookies, mais cela peut affecter le fonctionnement du site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Droit applicable
            </h2>
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français seront compétents.
              </p>
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mt-4">
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