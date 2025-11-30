# 🚀 Créer la fonction log-error manuellement dans Supabase

## Étapes à suivre

### 1. Accéder au Dashboard Supabase

Allez sur : https://supabase.com/dashboard/project/wjzlicokhxitmeoxkjzv/functions

### 2. Créer une nouvelle fonction

1. Cliquez sur le bouton **"New Function"** ou **"Create Function"**
2. Nommez-la : **`log-error`** (exactement comme ça, avec un tiret)
3. Cliquez sur **"Create"**

### 3. Copier le code

**Remplacez TOUT le code par défaut par :**

```typescript
// =====================================================
// LOG-ERROR - Edge Function pour logger les erreurs silencieusement
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://centrinote.fr',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight - TOUJOURS répondre 200 OK
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // Récupérer le token JWT depuis le header Authorization (optionnel)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      // Initialiser Supabase avec le service role pour vérifier le token
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseServiceKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Vérifier le token et récupérer l'utilisateur
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            userId = user.id;
          }
        } catch (authError) {
          // Ignorer les erreurs d'auth, continuer sans userId
          console.error('Error verifying token:', authError);
        }
      }
    }

    // Parser le body
    let body: any;
    try {
      body = await req.json();
    } catch (parseError) {
      // Body invalide, mais renvoyer 200 quand même
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Valider les données
    if (!body.message || !body.level) {
      // Données invalides, mais renvoyer 200 quand même
      return new Response(
        JSON.stringify({ success: false, error: 'message and level are required' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Initialiser Supabase avec le service role pour insérer dans error_logs
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://wjzlicokhxitmeoxkjzv.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
      // Erreur config, mais renvoyer 200 quand même
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insérer dans error_logs
    const { error: insertError } = await supabase.from('error_logs').insert({
      user_id: userId,
      message: body.message,
      level: body.level,
      meta: body.meta || {},
      source: body.source || 'frontend',
      stack_trace: body.stack_trace,
      url: body.url,
      user_agent: body.user_agent,
    });

    if (insertError) {
      console.error('❌ Error inserting log:', insertError);
      // Erreur DB, mais renvoyer 200 quand même
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Error in log-error function:', error);
    // Erreur inattendue, mais renvoyer 200 quand même
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 200, headers: corsHeaders }
    );
  }
});
```

### 4. Déployer

1. Cliquez sur le bouton **"Deploy"** ou **"Save"** (en haut à droite)
2. Attendez que le déploiement soit terminé (quelques secondes)

### 5. Vérifier

Une fois déployée, la fonction sera accessible à :
```
https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/log-error
```

## ✅ Vérification finale

Testez avec cette commande :

```bash
curl -X OPTIONS https://wjzlicokhxitmeoxkjzv.supabase.co/functions/v1/log-error \
  -H "Origin: https://centrinote.fr" \
  -v
```

**Résultat attendu :** `200 OK` avec les headers CORS présents.

## 📝 Notes importantes

- **Nom de la fonction** : Doit être exactement `log-error` (avec un tiret)
- **Pas besoin de Docker** : Création directe dans le dashboard
- **Variables d'environnement** : `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont automatiquement disponibles dans les Edge Functions Supabase

