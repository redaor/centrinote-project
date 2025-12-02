# Système de Logging pour Edge Functions

## Vue d'ensemble

Toutes les Edge Functions utilisent maintenant un système de logging unifié qui :
- **En DEV** : utilise `console.log/error/warn` (visible dans les logs Supabase)
- **En PROD** : envoie silencieusement les logs à l'Edge Function `log-error` (stockage dans `error_logs`)

## Utilisation

### Import du logger

```typescript
import { logger } from "../_shared/logger.ts";
```

### Méthodes disponibles

```typescript
// Log info
logger.info("Message informatif", { meta: "données" });

// Log warning
logger.warn("Avertissement", { error: new Error("...") });

// Log error
logger.error("Erreur critique", new Error("..."), { context: "..." });

// Log debug
logger.debug("Message de debug", { details: "..." });
```

## Exemples

### Log simple

```typescript
logger.info("Nouveau message reçu", {
  userId: user_id.substring(0, 8) + "...",
  messageLength: message.length
});
```

### Log avec erreur

```typescript
try {
  // Code...
} catch (err) {
  logger.error("Erreur lors de l'opération", 
    err instanceof Error ? err : new Error(String(err)),
    { context: "additional info" }
  );
}
```

### Log avec warning

```typescript
if (error) {
  logger.warn("Erreur non bloquante", {
    error: new Error(error.message),
    conversationId: conversation.id
  });
}
```

## Sanitisation automatique

Le logger sanitise automatiquement les données sensibles :
- Emails → `[REDACTED_EMAIL]`
- Tokens JWT → `[REDACTED_TOKEN]`
- UUIDs → partiellement masqués
- Clés API → `[REDACTED]`
- Mots de passe → `[REDACTED]`

## Comportement

### En développement

```typescript
// Affiche dans la console Supabase
logger.info("Test"); 
// → ℹ️ [INFO] Test
```

### En production

```typescript
// Envoie silencieusement à log-error (non bloquant)
logger.info("Test");
// → Aucun affichage console, stocké dans error_logs
```

## Avantages

1. **Pas de pollution console en prod** : Les logs ne s'affichent plus dans la console
2. **Centralisation** : Tous les logs sont stockés dans `error_logs` (visible dans l'admin)
3. **Sanitisation** : Données sensibles automatiquement masquées
4. **Non bloquant** : Les erreurs de logging ne bloquent pas le flux principal
5. **Métadonnées** : Chaque log inclut des métadonnées (source, function_name, etc.)

## Migration

Pour migrer une Edge Function existante :

1. **Importer le logger** :
```typescript
import { logger } from "../_shared/logger.ts";
```

2. **Remplacer console.log** :
```typescript
// Avant
console.log("Message");

// Après
logger.info("Message");
```

3. **Remplacer console.error** :
```typescript
// Avant
console.error("Erreur:", err);

// Après
logger.error("Erreur", err instanceof Error ? err : new Error(String(err)));
```

4. **Remplacer console.warn** :
```typescript
// Avant
console.warn("Avertissement:", data);

// Après
logger.warn("Avertissement", { data });
```

## Vérification

Pour vérifier que tous les `console.*` ont été remplacés :

```bash
grep -r "console\." supabase/functions/chat-memory/
```

Aucun résultat = migration complète ✅

