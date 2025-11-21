/**
 * Helpers pour le système d'automatisation
 * Calcul de next_execution_at, parsing des configurations, etc.
 */

export interface AutomationSettings {
  hour?: string;
  milestone?: number;
  delayDays?: number;
  studyHour?: string;
  breakDuration?: number;
  emailDay?: string;
  emailHour?: string;
  backupHour?: string;
  quoteTime?: string;
}

/**
 * Calcule le prochain moment d'exécution basé sur l'heure configurée
 * @param hour - Heure au format HH:MM (ex: "14:05")
 * @param timezone - Timezone (par défaut: Europe/Paris)
 * @returns Date ISO string du prochain moment d'exécution
 */
/**
 * Calcule la prochaine date d'exécution pour une heure locale donnée
 * Logique simplifiée : Si l'heure est passée aujourd'hui → demain, sinon → aujourd'hui
 * 
 * @param hour - Heure locale au format HH:MM (ex: "22:00")
 * @param timezone - Fuseau horaire IANA (ex: "Africa/Algiers")
 * @returns Date ISO string en UTC pour la prochaine exécution
 */
export function calculateNextExecutionFromHour(
  hour: string,
  timezone: string = 'Europe/Paris'
): string {
  // Parser l'heure au format HH:MM
  const [targetHours, targetMinutes] = hour.split(':').map(Number);

  if (isNaN(targetHours) || isNaN(targetMinutes) || targetHours < 0 || targetHours > 23 || targetMinutes < 0 || targetMinutes > 59) {
    throw new Error(`Invalid hour format: ${hour}. Expected HH:MM (ex: 22:00)`);
  }

  const now = new Date();

  // Obtenir l'heure locale actuelle dans le fuseau horaire de l'utilisateur
  const localTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const localParts = localTimeFormatter.formatToParts(now);
  const localPartsObj: Record<string, string> = {};
  localParts.forEach(part => {
    if (part.type !== 'literal') {
      localPartsObj[part.type] = part.value;
    }
  });

  const currentLocalYear = parseInt(localPartsObj.year);
  const currentLocalMonth = parseInt(localPartsObj.month) - 1;
  const currentLocalDay = parseInt(localPartsObj.day);
  const currentLocalHour = parseInt(localPartsObj.hour);
  const currentLocalMinute = parseInt(localPartsObj.minute);

  // Comparer l'heure actuelle avec l'heure cible
  const currentLocalTime = currentLocalHour * 60 + currentLocalMinute;
  const targetTime = targetHours * 60 + targetMinutes;

  // Déterminer la date cible (aujourd'hui ou demain)
  let targetYear = currentLocalYear;
  let targetMonth = currentLocalMonth;
  let targetDay = currentLocalDay;

  // Si l'heure cible est déjà passée aujourd'hui → programmer pour demain
  if (targetTime <= currentLocalTime) {
    const tomorrow = new Date(currentLocalYear, currentLocalMonth, currentLocalDay);
    tomorrow.setDate(tomorrow.getDate() + 1);
    targetYear = tomorrow.getFullYear();
    targetMonth = tomorrow.getMonth();
    targetDay = tomorrow.getDate();
  }

  // Créer une date locale pour l'heure cible
  const localDate = new Date(currentLocalYear, currentLocalMonth, currentLocalDay, targetHours, targetMinutes, 0, 0);
  if (targetDay !== currentLocalDay) {
    localDate.setDate(localDate.getDate() + (targetDay - currentLocalDay));
  }

  // Convertir la date locale en UTC en utilisant le fuseau horaire
  // On crée une date "naive" (sans timezone) et on la convertit
  const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T${String(targetHours).padStart(2, '0')}:${String(targetMinutes).padStart(2, '0')}:00`;
  
  // Utiliser Intl pour obtenir l'offset UTC du fuseau horaire à cette date
  const tempDate = new Date(dateStr + 'Z'); // Créer une date UTC de référence
  const tzOffset = getTimezoneOffsetForDate(tempDate, timezone);
  
  // Créer la date UTC finale
  const nextExecutionUTC = new Date(tempDate.getTime() - tzOffset);

  // Log pour debug
  if (typeof console !== 'undefined' && (import.meta.env?.DEV || import.meta.env?.VITE_DEBUG === 'true')) {
    const localFormatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const nextLocalTime = localFormatter.format(nextExecutionUTC);
    console.log(`📅 [calculateNextExecution] Heure locale: ${hour}, Fuseau: ${timezone}`);
    console.log(`   Heure locale actuelle: ${currentLocalHour}:${String(currentLocalMinute).padStart(2, '0')}`);
    console.log(`   Prochaine exécution locale: ${nextLocalTime}`);
    console.log(`   Prochaine exécution UTC: ${nextExecutionUTC.toISOString()}`);
  }

  return nextExecutionUTC.toISOString();
}

/**
 * Obtient le décalage en millisecondes pour une timezone et une date données
 */
function getTimezoneOffsetForDate(date: Date, timezone: string): number {
  // Créer deux formatters pour comparer UTC et timezone
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const utcParts = utcFormatter.formatToParts(date);
  const tzParts = tzFormatter.formatToParts(date);

  const utcTime = new Date(
    parseInt(utcParts.find(p => p.type === 'year')!.value),
    parseInt(utcParts.find(p => p.type === 'month')!.value) - 1,
    parseInt(utcParts.find(p => p.type === 'day')!.value),
    parseInt(utcParts.find(p => p.type === 'hour')!.value),
    parseInt(utcParts.find(p => p.type === 'minute')!.value)
  ).getTime();

  const tzTime = new Date(
    parseInt(tzParts.find(p => p.type === 'year')!.value),
    parseInt(tzParts.find(p => p.type === 'month')!.value) - 1,
    parseInt(tzParts.find(p => p.type === 'day')!.value),
    parseInt(tzParts.find(p => p.type === 'hour')!.value),
    parseInt(tzParts.find(p => p.type === 'minute')!.value)
  ).getTime();

  return tzTime - utcTime;
}

/**
 * Calcule le prochain moment d'exécution pour un jour de la semaine spécifique
 * @param dayOfWeek - Jour de la semaine (0=dimanche, 1=lundi, ..., 6=samedi)
 * @param hour - Heure au format HH:MM
 * @returns Date ISO string du prochain moment d'exécution
 */
export function calculateNextExecutionFromWeekday(
  dayOfWeek: number,
  hour: string
): string {
  const [hours, minutes] = hour.split(':').map(Number);

  const now = new Date();
  const nextExecution = new Date();
  nextExecution.setHours(hours, minutes, 0, 0);

  // Calculer le nombre de jours jusqu'au prochain jour cible
  const currentDay = now.getDay();
  let daysUntilTarget = dayOfWeek - currentDay;

  if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextExecution <= now)) {
    daysUntilTarget += 7;
  }

  nextExecution.setDate(now.getDate() + daysUntilTarget);

  return nextExecution.toISOString();
}

/**
 * Calcule next_execution_at basé sur le type d'automatisation et ses paramètres
 * @param automationId - ID de l'automatisation
 * @param settings - Configuration de l'automatisation
 * @param timezone - Fuseau horaire de l'utilisateur (optionnel, détecté automatiquement si non fourni)
 * @returns Date ISO string du prochain moment d'exécution ou null
 */
export function calculateNextExecution(
  automationId: string,
  settings: AutomationSettings,
  timezone?: string
): string | null {
  try {
    // Détecter le fuseau horaire si non fourni
    const userTimezone = timezone || (typeof Intl !== 'undefined' 
      ? Intl.DateTimeFormat().resolvedOptions().timeZone 
      : 'UTC');

    switch (automationId) {
      case 'daily-review':
        if (settings.hour) {
          return calculateNextExecutionFromHour(settings.hour, userTimezone);
        }
        break;

      case 'study-reminder':
        if (settings.studyHour) {
          return calculateNextExecutionFromHour(settings.studyHour, userTimezone);
        }
        break;

      case 'daily-backup':
        if (settings.backupHour) {
          return calculateNextExecutionFromHour(settings.backupHour, userTimezone);
        }
        break;

      case 'daily_quote':
        if (settings.quoteTime) {
          return calculateNextExecutionFromHour(settings.quoteTime, userTimezone);
        }
        break;

      case 'weekly-summary':
        if (settings.emailDay && settings.emailHour) {
          const dayMap: Record<string, number> = {
            'dimanche': 0,
            'lundi': 1,
            'mardi': 2,
            'mercredi': 3,
            'jeudi': 4,
            'vendredi': 5,
            'samedi': 6
          };
          const dayOfWeek = dayMap[settings.emailDay.toLowerCase()];
          if (dayOfWeek !== undefined) {
            return calculateNextExecutionFromWeekday(dayOfWeek, settings.emailHour);
          }
        }
        break;

      case 'monthly-report':
        if (settings.emailHour) {
          // Premier jour du mois prochain à l'heure spécifiée
          const [hours, minutes] = settings.emailHour.split(':').map(Number);
          const now = new Date();
          const nextExecution = new Date(now.getFullYear(), now.getMonth() + 1, 1, hours, minutes, 0, 0);
          return nextExecution.toISOString();
        }
        break;

      // Les automatisations déclenchées par événement n'ont pas de next_execution_at
      case 'vocab-milestone':
      case 'forgotten-notes':
      case 'break-reminder':
      case 'focus_mode':
      case 'break_time':
        return null;

      default:
        console.warn(`Unknown automation ID for next_execution calculation: ${automationId}`);
        return null;
    }
  } catch (error) {
    console.error(`Error calculating next_execution for ${automationId}:`, error);
    return null;
  }

  return null;
}

/**
 * Parse le jour de la semaine en français vers un numéro
 */
export function parseDayOfWeek(dayName: string): number {
  const dayMap: Record<string, number> = {
    'dimanche': 0,
    'lundi': 1,
    'mardi': 2,
    'mercredi': 3,
    'jeudi': 4,
    'vendredi': 5,
    'samedi': 6
  };

  return dayMap[dayName.toLowerCase()] ?? 1; // Default: lundi
}

/**
 * Formate une heure en HH:MM
 */
export function formatHour(hour: string): string {
  const [h, m] = hour.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/**
 * Vérifie si une heure est valide (HH:MM)
 */
export function isValidHour(hour: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(hour);
}

/**
 * Convertit une expression cron simple en next_execution_at
 * Supporte uniquement les expressions simples du type "0 14 * * *" (14h tous les jours)
 */
export function cronToNextExecution(cronExpression: string): string | null {
  // Parse cron: minute hour day month dayOfWeek
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) {
    return null;
  }

  const [minute, hour, day, month, dayOfWeek] = parts;

  // Cas simple: tous les jours à une heure fixe (ex: "0 14 * * *")
  if (day === '*' && month === '*' && dayOfWeek === '*') {
    const hourStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    const userTimezone = typeof Intl !== 'undefined' 
      ? Intl.DateTimeFormat().resolvedOptions().timeZone 
      : 'UTC';
    return calculateNextExecutionFromHour(hourStr, userTimezone);
  }

  // Cas: jour de la semaine spécifique (ex: "0 14 * * 5" = vendredi 14h)
  if (day === '*' && month === '*' && dayOfWeek !== '*') {
    const hourStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    return calculateNextExecutionFromWeekday(parseInt(dayOfWeek), hourStr);
  }

  return null;
}

/**
 * Convertit un objet trigger_config en schedule_config pour compatibilité
 */
export function triggerConfigToScheduleConfig(
  automationId: string,
  triggerConfig: AutomationSettings
): Record<string, any> {
  const scheduleConfig: any = {};

  // Déterminer le type de schedule
  if (automationId.includes('daily') || automationId === 'study-reminder' || automationId === 'daily_quote') {
    scheduleConfig.type = 'daily';

    // Extraire l'heure
    const hour = triggerConfig.hour ||
                 triggerConfig.studyHour ||
                 triggerConfig.backupHour ||
                 triggerConfig.quoteTime;

    if (hour) {
      const [h, m] = hour.split(':');
      scheduleConfig.cron_expression = `${m} ${h} * * *`;
      scheduleConfig.time = hour;
    }
  } else if (automationId === 'weekly-summary') {
    scheduleConfig.type = 'weekly';
    if (triggerConfig.emailDay && triggerConfig.emailHour) {
      const dayNum = parseDayOfWeek(triggerConfig.emailDay);
      const [h, m] = triggerConfig.emailHour.split(':');
      scheduleConfig.cron_expression = `${m} ${h} * * ${dayNum}`;
      scheduleConfig.day_of_week = dayNum;
      scheduleConfig.time = triggerConfig.emailHour;
    }
  } else if (automationId === 'monthly-report') {
    scheduleConfig.type = 'monthly';
    if (triggerConfig.emailHour) {
      const [h, m] = triggerConfig.emailHour.split(':');
      scheduleConfig.cron_expression = `${m} ${h} 1 * *`;
      scheduleConfig.time = triggerConfig.emailHour;
    }
  }

  return scheduleConfig;
}
