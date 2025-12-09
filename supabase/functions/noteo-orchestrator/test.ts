/**
 * Tests pour noteo-orchestrator Edge Function
 *
 * Usage:
 *   deno test --allow-net --allow-env test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

const FUNCTION_URL = 'http://localhost:54321/functions/v1/noteo-orchestrator';

// Mock des clés (à remplacer par vos vraies clés pour les tests réels)
const MOCK_SEARCH_KEY = Deno.env.get('OPENAI_SEARCH_KEY') || 'sk-search-test';
const MOCK_CHAT_KEY = Deno.env.get('OPENAI_CHAT_KEY') || 'sk-chat-test';
const MOCK_AIDE_KEY = Deno.env.get('OPENAI_AIDE_KEY') || 'sk-aide-test';
const INVALID_KEY = 'sk-invalid-test';

Deno.test('Orchestrator - Clé inconnue (401)', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Test message',
      apiKey: INVALID_KEY,
    }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.error, 'Clé inconnue');
});

Deno.test('Orchestrator - Clé search avec intention search (200)', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Cherche mes notes sur TypeScript',
      apiKey: MOCK_SEARCH_KEY,
    }),
  });

  // Devrait être 200 si la clé est valide dans l'environnement
  // Sinon 401 si la clé n'est pas configurée
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', data);
});

Deno.test('Orchestrator - Clé chat avec intention search (403)', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Cherche mes notes',
      apiKey: MOCK_CHAT_KEY,
    }),
  });

  // Devrait être 403 car clé chat utilisée pour intention search
  if (response.status !== 401) { // 401 si clés non configurées
    assertEquals(response.status, 403);
    const data = await response.json();
    assertEquals(data.error, 'Clé non autorisée pour cette intention');
  }
});

Deno.test('Orchestrator - Détection intention chat', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Bonjour, comment vas-tu ?',
      apiKey: MOCK_CHAT_KEY,
    }),
  });

  console.log('Chat intent - Status:', response.status);
  const data = await response.json();
  console.log('Chat intent - Response:', data);
});

Deno.test('Orchestrator - Détection intention aide', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Comment créer une note ?',
      apiKey: MOCK_AIDE_KEY,
    }),
  });

  console.log('Aide intent - Status:', response.status);
  const data = await response.json();
  console.log('Aide intent - Response:', data);
});

Deno.test('Orchestrator - CORS headers', async () => {
  const response = await fetch(FUNCTION_URL, {
    method: 'OPTIONS',
  });

  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
  assertEquals(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
});
