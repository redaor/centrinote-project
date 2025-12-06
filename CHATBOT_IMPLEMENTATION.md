# 🤖 Système de Chatbot Centrinote

## Vue d'ensemble

Le système de chatbot a été intégré dans Centrinote pour aider les utilisateurs directement depuis la section Contact. Il utilise l'IA OpenAI (GPT-4o-mini) pour répondre aux questions et propose automatiquement une escalade vers email si le problème ne peut pas être résolu.

## Architecture

### Composants Frontend

1. **`ChatbotWidget.tsx`** - Composant React principal du chatbot
   - Interface de chat avec messages
   - Gestion de l'état (minimisé/ouvert)
   - Affichage des options d'escalation
   - Support du mode sombre

2. **`chatbotService.ts`** - Service frontend
   - Communication avec l'Edge Function
   - Gestion des requêtes et réponses
   - Gestion de l'escalation

### Backend

1. **Edge Function `chatbot-handler`**
   - Traitement des messages avec OpenAI
   - Calcul de la confiance des réponses
   - Création automatique de tickets
   - Envoi d'emails à l'équipe admin

2. **Table `support_tickets`**
   - Stockage des tickets créés
   - Historique des conversations
   - Statuts et priorités

## Fonctionnalités

### 1. Chat avec l'IA
- Réponses intelligentes basées sur le contexte de Centrinote
- Historique de conversation (5 derniers messages)
- Calcul de confiance pour déterminer si l'escalation est nécessaire

### 2. Escalation Automatique
- Si la confiance < 0.7, proposition d'escalation
- Création automatique d'un ticket dans `support_tickets`
- Génération d'un brouillon d'email

### 3. Transfert vers Email
- Bouton "Créer un email de support"
- Envoi automatique à `contact@centrinote.fr`
- Création/mise à jour du ticket
- Confirmation à l'utilisateur avec numéro de ticket

## Configuration

### Variables d'environnement requises

```env
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Migration de base de données

Exécuter la migration pour créer la table `support_tickets`:

```bash
supabase migration up 20251203_support_tickets
```

## Utilisation

### Intégration dans un composant

```tsx
import { ChatbotWidget } from '../chatbot/ChatbotWidget';

function MyComponent() {
  return (
    <div>
      {/* Votre contenu */}
      <ChatbotWidget position="bottom-right" initialMinimized={false} />
    </div>
  );
}
```

### Position du widget

- `bottom-right` (par défaut)
- `bottom-left`
- `top-right`
- `top-left`

## Flux de données

```
Utilisateur → ChatbotWidget → chatbotService → Edge Function chatbot-handler
                                                      ↓
                                              OpenAI API (GPT-4o-mini)
                                                      ↓
                                              Calcul confiance
                                                      ↓
                                    ┌─────────────────┴─────────────────┐
                                    ↓                                   ↓
                            Confiance ≥ 0.7                    Confiance < 0.7
                                    ↓                                   ↓
                            Réponse directe                    Proposition escalation
                                                                    ↓
                                                            Création ticket
                                                                    ↓
                                                            Envoi email admin
```

## Traductions

Toutes les chaînes de caractères sont traduites dans `src/i18n/translations.ts`:

- `chatbot_title` - Titre du chatbot
- `chatbot_welcome` - Message de bienvenue
- `chatbot_error` - Message d'erreur
- `chatbot_create_email` - Bouton création email
- `chatbot_email_sent` - Confirmation envoi email
- Et plus...

## Sécurité

- RLS (Row Level Security) activé sur `support_tickets`
- Les utilisateurs ne voient que leurs propres tickets
- Les admins peuvent voir tous les tickets
- Validation des entrées utilisateur
- Protection CORS

## Améliorations futures

- [ ] Support des fichiers joints
- [ ] Historique des conversations persisté
- [ ] Notifications en temps réel
- [ ] Interface admin pour gérer les tickets
- [ ] Analytics et métriques
- [ ] Support multi-langues amélioré
- [ ] Intégration avec le système de notifications existant

## Dépannage

### Le chatbot ne répond pas
1. Vérifier que `OPENAI_API_KEY` est configuré
2. Vérifier les logs de l'Edge Function
3. Vérifier la connexion réseau

### Les emails ne sont pas envoyés
1. Vérifier que `automation-email` fonctionne
2. Vérifier les logs de `chatbot-handler`
3. Vérifier la configuration SMTP

### Les tickets ne sont pas créés
1. Vérifier que la migration a été exécutée
2. Vérifier les permissions RLS
3. Vérifier les logs Supabase

