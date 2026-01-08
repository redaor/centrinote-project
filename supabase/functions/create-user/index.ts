// 🔐 Edge Function - Création d'utilisateur SANS session automatique
// ================================================================
// Cette fonction crée un utilisateur avec admin.createUser() pour éviter
// la création automatique de session que fait signUp()

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

serve(async (req) => {
  // Gérer CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Edge Function create-user appelée');

    // Récupérer les données de la requête
    const { email, password, name, firstName, lastName }: CreateUserRequest = await req.json();

    // Validation des champs requis
    if (!email || !password) {
      console.error('❌ Email ou mot de passe manquant');
      return new Response(
        JSON.stringify({
          error: {
            message: 'Email et mot de passe requis',
            type: 'ValidationError'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Format email invalide:', email);
      return new Response(
        JSON.stringify({
          error: {
            message: 'Format email invalide',
            type: 'ValidationError'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Validation longueur mot de passe
    if (password.length < 6) {
      console.error('❌ Mot de passe trop court');
      return new Response(
        JSON.stringify({
          error: {
            message: 'Le mot de passe doit contenir au moins 6 caractères',
            type: 'ValidationError'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('📝 Données reçues:', {
      email,
      hasPassword: !!password,
      name,
      firstName,
      lastName
    });

    // Créer le client Supabase Admin
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variables d\'environnement manquantes');
      throw new Error('Configuration serveur invalide');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('🔧 Client Supabase Admin créé');

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Erreur vérification utilisateur existant:', listError);
    } else {
      const userExists = existingUsers.users.find(u => u.email === email.toLowerCase());
      if (userExists) {
        console.warn('⚠️ Utilisateur existe déjà:', email);
        return new Response(
          JSON.stringify({
            error: {
              message: 'Cet email est déjà utilisé',
              type: 'UserAlreadyExists'
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }

    // 🔴 CLEF : Créer l'utilisateur avec admin.createUser()
    // Cela ne crée PAS de session automatique, contrairement à signUp()
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      user_metadata: {
        name: name || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
        firstName: firstName || name?.split(' ')[0] || '',
        lastName: lastName || name?.split(' ').slice(1).join(' ') || '',
        signup_time: new Date().toISOString(),
        signup_source: 'web',
        verification_method: 'edge_function',
      },
      email_confirm: false, // 🔒 Force la confirmation manuelle
      app_metadata: {
        provider: 'email',
        role: 'user',
      },
    });

    if (createError) {
      console.error('❌ Erreur création utilisateur Supabase:', createError);

      let errorMessage = 'Erreur lors de la création du compte';
      if (createError.message.includes('already registered')) {
        errorMessage = 'Cet email est déjà utilisé';
      } else if (createError.message.includes('password')) {
        errorMessage = 'Mot de passe invalide';
      }

      return new Response(
        JSON.stringify({
          error: {
            message: errorMessage,
            type: createError.name || 'AuthError',
            details: createError.message
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('✅ Utilisateur créé avec succès:', {
      userId: userData.user.id,
      email: userData.user.email,
      emailConfirmed: userData.user.email_confirmed_at,
    });

    // 📧 Envoyer l'email de confirmation via l'Edge Function send-confirmation
    let emailSent = false;
    try {
      console.log('📧 Envoi email de confirmation...');

      const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke('send-confirmation', {
        body: {
          email: email.toLowerCase().trim(),
          userId: userData.user.id,
          type: 'signup',
        },
      });

      if (emailError) {
        console.error('⚠️ Erreur envoi email (non bloquant):', emailError);
      } else {
        console.log('✅ Email de confirmation envoyé');
        emailSent = true;
      }
    } catch (emailError) {
      console.error('⚠️ Erreur inattendue envoi email (non bloquant):', emailError);
    }

    // 🎉 Retourner le résultat SANS session
    console.log('📩 Inscription réussie, en attente de validation email');

    return new Response(
      JSON.stringify({
        user: {
          id: userData.user.id,
          email: userData.user.email,
          email_confirmed_at: userData.user.email_confirmed_at, // null
          user_metadata: userData.user.user_metadata,
        },
        error: null,
        hasSession: false, // ✅ Garanti aucune session
        emailSent,
        requiresEmailVerification: true,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erreur inattendue Edge Function:', error);

    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Erreur inconnue',
          type: 'ServerError',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
