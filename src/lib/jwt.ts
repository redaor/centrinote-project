/**
 * Service JWT pour la génération et vérification de tokens
 * Utilisé pour les confirmations d'email personnalisées
 */

import { jwtVerify, SignJWT } from 'jose';

// Durée de validité du token : 24 heures
const TOKEN_EXPIRATION = 24 * 60 * 60; // 24h en secondes

// Secret JWT (doit être dans les variables d'environnement)
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production';

// Convertir le secret en Uint8Array pour jose
const secret = new TextEncoder().encode(JWT_SECRET);

/**
 * Payload du token de confirmation email
 */
export interface EmailConfirmationPayload {
  userId: string;
  email: string;
  type: 'email_confirmation';
  iat?: number;
  exp?: number;
}

/**
 * Générer un token JWT pour la confirmation d'email
 */
export async function generateEmailConfirmationToken(
  userId: string,
  email: string
): Promise<string> {
  try {
    const token = await new SignJWT({
      userId,
      email,
      type: 'email_confirmation'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_EXPIRATION}s`)
      .sign(secret);

    return token;
  } catch (error) {
    console.error('❌ Erreur génération token JWT:', error);
    throw new Error('Failed to generate confirmation token');
  }
}

/**
 * Vérifier et décoder un token JWT
 */
export async function verifyEmailConfirmationToken(
  token: string
): Promise<EmailConfirmationPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);

    // Vérifier que c'est bien un token de confirmation email
    if (payload.type !== 'email_confirmation') {
      throw new Error('Invalid token type');
    }

    return payload as EmailConfirmationPayload;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new Error('Token expired');
      }
      if (error.message.includes('invalid')) {
        throw new Error('Invalid token');
      }
    }
    console.error('❌ Erreur vérification token JWT:', error);
    throw new Error('Token verification failed');
  }
}

/**
 * Générer un token simple (pour les tests sans JWT)
 * ⚠️ NE PAS UTILISER EN PRODUCTION
 */
export function generateSimpleToken(userId: string): string {
  const randomPart = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `${userId}_${timestamp}_${randomPart}`;
}

/**
 * Vérifier si un token est expiré
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Calculer la date d'expiration (24h à partir de maintenant)
 */
export function getExpirationDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + TOKEN_EXPIRATION * 1000);
}
