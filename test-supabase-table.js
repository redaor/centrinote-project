#!/usr/bin/env node

// 🔍 Script de test de la table email_verifications
// Usage: node test-supabase-table.js

import { createClient } from '@supabase/supabase-js';

// Variables d'environnement (à ajuster selon votre configuration)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testEmailVerificationsTable() {
  console.log('🔍 Test de la table email_verifications...\n');
  
  try {
    // Test 1: Vérifier si la table existe
    console.log('1. Vérification existence table...');
    const { data, error } = await supabase
      .from('email_verifications')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Table email_verifications n\'existe pas!');
        console.log('💡 Créez-la avec le SQL fourni dans WORKFLOW-N8N-SETUP.md');
        return false;
      } else {
        console.log('❌ Erreur:', error.message);
        return false;
      }
    }
    
    console.log('✅ Table email_verifications existe');
    console.log('📊 Nombre d\'enregistrements existants:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('📋 Premiers enregistrements:');
      data.slice(0, 3).forEach((record, i) => {
        console.log(`  ${i + 1}. Email: ${record.email}, Token: ${record.verification_token?.substring(0, 8)}...`);
      });
    }
    
    // Test 2: Essayer d'insérer un enregistrement de test
    console.log('\n2. Test d\'insertion...');
    const testRecord = {
      email: 'test@centrinote.fr',
      user_id: 'test-uuid-123',
      verification_token: 'test-token-' + Date.now(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      action: 'test'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('email_verifications')
      .insert(testRecord)
      .select();
    
    if (insertError) {
      console.log('❌ Erreur insertion:', insertError.message);
      if (insertError.message.includes('duplicate key')) {
        console.log('💡 Token déjà existant (normal pour un test)');
      }
    } else {
      console.log('✅ Insertion test réussie:', insertData[0]?.id);
      
      // Nettoyer l'enregistrement de test
      await supabase
        .from('email_verifications')
        .delete()
        .eq('id', insertData[0].id);
      console.log('🧹 Enregistrement de test supprimé');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Erreur inattendue:', error.message);
    return false;
  }
}

// Test des colonnes
async function testTableSchema() {
  console.log('\n🔍 Test schéma table...');
  
  const expectedColumns = [
    'id', 'email', 'user_id', 'verification_token', 
    'action', 'verified', 'expires_at', 'verified_at', 
    'created_at', 'updated_at'
  ];
  
  try {
    // Essayer une requête avec toutes les colonnes
    const { data, error } = await supabase
      .from('email_verifications')
      .select(expectedColumns.join(', '))
      .limit(1);
    
    if (error) {
      console.log('❌ Erreur schéma:', error.message);
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        const missingColumn = error.message.match(/column "(.+)" does not exist/)?.[1];
        console.log(`💡 Colonne manquante: ${missingColumn}`);
      }
      return false;
    }
    
    console.log('✅ Schéma table correct - toutes les colonnes présentes');
    return true;
    
  } catch (error) {
    console.log('❌ Erreur test schéma:', error.message);
    return false;
  }
}

// Exécution
async function runTests() {
  console.log('🧪 Tests table Supabase email_verifications\n');
  
  const tableExists = await testEmailVerificationsTable();
  
  if (tableExists) {
    await testTableSchema();
  }
  
  console.log('\n📊 Résumé:');
  console.log('- Table exists:', tableExists ? '✅' : '❌');
  
  if (!tableExists) {
    console.log('\n🔧 Pour créer la table:');
    console.log('1. Ouvrir Supabase SQL Editor');
    console.log('2. Copier le SQL de WORKFLOW-N8N-SETUP.md');
    console.log('3. Exécuter le script');
  }
}

runTests().catch(console.error);