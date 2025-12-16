# 🔐 Daily API - Migration vers Edge Function

## ⚠️ Problème Actuel

**Daily API** est actuellement utilisée **côté client** avec la clé exposée :

```typescript
// src/lib/daily.ts
this.apiKey = import.meta.env.VITE_DAILY_API_KEY || '';
```

**❌ RISQUE DE SÉCURITÉ** : La clé API Daily est visible dans le code client.

---

## ✅ Solution : Créer une Edge Function Supabase

### 1. Créer la Edge Function `daily-api`

```bash
supabase functions new daily-api
```

### 2. Code de la Edge Function

**Fichier : `supabase/functions/daily-api/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
const DAILY_BASE_URL = 'https://api.daily.co/v1';

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'https://centrinote.fr',
  'https://www.centrinote.fr',
]);

function buildCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && allowedOrigins.has(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  // Gérer OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  if (!DAILY_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'DAILY_API_KEY non configurée' }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const { action, ...params } = await req.json();

    let response: Response;
    let url = '';

    switch (action) {
      case 'createRoom':
        url = `${DAILY_BASE_URL}/rooms`;
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params.config || {}),
        });
        break;

      case 'deleteRoom':
        if (!params.roomName) {
          return new Response(
            JSON.stringify({ error: 'roomName requis' }),
            { status: 400, headers: corsHeaders }
          );
        }
        url = `${DAILY_BASE_URL}/rooms/${params.roomName}`;
        response = await fetch(url, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
        });
        break;

      case 'getRoom':
        if (!params.roomName) {
          return new Response(
            JSON.stringify({ error: 'roomName requis' }),
            { status: 400, headers: corsHeaders }
          );
        }
        url = `${DAILY_BASE_URL}/rooms/${params.roomName}`;
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
        });
        break;

      case 'getRecording':
        if (!params.recordingId) {
          return new Response(
            JSON.stringify({ error: 'recordingId requis' }),
            { status: 400, headers: corsHeaders }
          );
        }
        url = `${DAILY_BASE_URL}/recordings/${params.recordingId}`;
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
        });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Action inconnue: ${action}` }),
          { status: 400, headers: corsHeaders }
        );
    }

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.message || `Erreur Daily API: ${response.status}` }),
        { status: response.status, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ [daily-api] Erreur:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

---

### 3. Migrer `src/lib/daily.ts`

**Modifier `src/lib/daily.ts` pour utiliser l'Edge Function :**

```typescript
import { supabase } from './supabase';

export class DailyClient {
  private domain: string;

  constructor() {
    this.domain = import.meta.env.VITE_DAILY_DOMAIN || 'centrinote.daily.co';
    // ⚠️ Plus besoin de VITE_DAILY_API_KEY côté client
  }

  /**
   * 🏠 Créer une nouvelle salle de réunion
   */
  async createRoom(config: DailyRoomConfig = {}): Promise<DailyRoom> {
    const roomConfig = {
      name: config.name || this.generateRoomName(),
      privacy: config.privacy || 'private',
      properties: {
        enable_recording: 'cloud',
        enable_chat: true,
        enable_screenshare: true,
        enable_knocking: false,
        lang: 'fr',
        max_participants: 10,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        ...config.properties
      }
    };

    const { data, error } = await supabase.functions.invoke('daily-api', {
      body: {
        action: 'createRoom',
        config: roomConfig,
      },
    });

    if (error) {
      throw new Error(`Erreur Daily.co: ${error.message}`);
    }

    return data.data;
  }

  /**
   * 🗑️ Supprimer une salle de réunion
   */
  async deleteRoom(roomName: string): Promise<void> {
    const { error } = await supabase.functions.invoke('daily-api', {
      body: {
        action: 'deleteRoom',
        roomName,
      },
    });

    if (error) {
      throw new Error(`Erreur suppression Daily.co: ${error.message}`);
    }
  }

  /**
   * 📋 Récupérer les informations d'une salle
   */
  async getRoom(roomName: string): Promise<DailyRoom> {
    const { data, error } = await supabase.functions.invoke('daily-api', {
      body: {
        action: 'getRoom',
        roomName,
      },
    });

    if (error) {
      throw new Error(`Erreur récupération salle: ${error.message}`);
    }

    return data.data;
  }

  /**
   * 🎥 Récupérer un enregistrement
   */
  async getRecording(recordingId: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('daily-api', {
      body: {
        action: 'getRecording',
        recordingId,
      },
    });

    if (error) {
      throw new Error(`Erreur récupération enregistrement: ${error.message}`);
    }

    return data.data;
  }

  // ... autres méthodes (generateRoomName, etc.) restent identiques
}
```

---

### 4. Configurer le Secret Supabase

```bash
supabase secrets set DAILY_API_KEY=your-daily-api-key-here
```

---

### 5. Déployer la Edge Function

```bash
supabase functions deploy daily-api
```

---

### 6. Supprimer la Variable Netlify

Après migration et tests réussis :

```bash
netlify env:unset VITE_DAILY_API_KEY
```

---

## 📋 Résumé

| API | État Actuel | Action Requise |
|-----|-------------|----------------|
| **Daily API** | ❌ Clé exposée côté client (`VITE_DAILY_API_KEY`) | ✅ Créer Edge Function `daily-api` |
| **Brave Search** | ✅ Déjà sécurisé dans `ai-chat` Edge Function | ✅ Aucune action |

---

## ✅ Checklist Migration

- [ ] Créer `supabase/functions/daily-api/index.ts`
- [ ] Migrer `src/lib/daily.ts` pour utiliser `supabase.functions.invoke('daily-api')`
- [ ] Supprimer toutes les références à `VITE_DAILY_API_KEY` dans `src/`
- [ ] Configurer `DAILY_API_KEY` dans Supabase secrets
- [ ] Déployer `daily-api` Edge Function
- [ ] Tester toutes les fonctionnalités Daily (création salle, suppression, enregistrements)
- [ ] Supprimer `VITE_DAILY_API_KEY` de Netlify

---

## 🔍 Note sur Brave Search

**Brave Search API** est **déjà sécurisée** dans l'Edge Function `ai-chat` :

```typescript
// supabase/functions/ai-chat/index.ts
const BRAVE_KEY = Deno.env.get("BRAVE_API_KEY"); // ✅ Clé côté serveur uniquement
```

**Aucune migration nécessaire** pour Brave Search.

---

## 🎯 Conclusion

**OUI, vous avez besoin d'une Edge Function pour Daily API** car la clé est actuellement exposée côté client.

**NON, pas besoin d'Edge Function pour Brave Search** car elle est déjà sécurisée dans `ai-chat`.





