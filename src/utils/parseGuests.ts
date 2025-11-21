// 📧 Utilitaires pour parser et valider des invités en masse
import { MeetingParticipant } from '../types/meetings';

interface ParsedGuest {
  name: string;
  email: string;
  role: 'guest';
}

interface ParseResult {
  valid: ParsedGuest[];
  invalid: string[];
  duplicates: string[];
}

// Validation email simple mais robuste
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

// Nettoyer et normaliser une chaîne
function cleanString(str: string): string {
  return str.trim().replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
}

// Parser une ligne de texte pour extraire nom et email
function parseLine(line: string): ParsedGuest | null {
  const cleaned = cleanString(line);
  if (!cleaned) return null;

  // Format: email seul
  if (isValidEmail(cleaned)) {
    const emailParts = cleaned.split('@');
    const name = emailParts[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return {
      name,
      email: cleaned.toLowerCase(),
      role: 'guest'
    };
  }

  // Format: "Name <email@domain.com>"
  const match1 = cleaned.match(/^(.+?)\s*<(.+?)>$/);
  if (match1) {
    const [, name, email] = match1;
    if (isValidEmail(email)) {
      return {
        name: cleanString(name),
        email: email.trim().toLowerCase(),
        role: 'guest'
      };
    }
  }

  // Format: "Name, email@domain.com" ou "Name;email@domain.com"
  const match2 = cleaned.match(/^(.+?)[,;]\s*(.+)$/);
  if (match2) {
    const [, name, email] = match2;
    if (isValidEmail(email)) {
      return {
        name: cleanString(name),
        email: email.trim().toLowerCase(),
        role: 'guest'
      };
    }
  }

  // Format: "Name email@domain.com" (séparé par espace)
  const parts = cleaned.split(/\s+/);
  const lastPart = parts[parts.length - 1];
  if (parts.length >= 2 && isValidEmail(lastPart)) {
    const name = parts.slice(0, -1).join(' ');
    return {
      name: cleanString(name),
      email: lastPart.toLowerCase(),
      role: 'guest'
    };
  }

  return null;
}

// Parser un texte contenant plusieurs emails/participants
export function parseBulkGuests(
  input: string, 
  existingParticipants: MeetingParticipant[] = []
): ParseResult {
  const lines = input
    .split(/[\n\r,;]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const valid: ParsedGuest[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const seenEmails = new Set<string>();

  // Ajouter les emails existants au set de déduplication
  existingParticipants.forEach(p => {
    if (p.email) {
      seenEmails.add(p.email.toLowerCase());
    }
  });

  for (const line of lines) {
    const parsed = parseLine(line);
    
    if (!parsed) {
      invalid.push(line);
      continue;
    }

    // Vérifier les doublons
    if (seenEmails.has(parsed.email)) {
      duplicates.push(parsed.email);
      continue;
    }

    seenEmails.add(parsed.email);
    valid.push(parsed);
  }

  return { valid, invalid, duplicates };
}

// Exemple d'utilisation dans un test
export function testParser() {
  const testInput = `
    john@example.com
    Jane Doe <jane@example.com>
    Bob Smith, bob@example.com
    Alice Wonder alice@example.com
    invalid-email
    Charlie;charlie@test.com
  `;
  
  return parseBulkGuests(testInput);
}