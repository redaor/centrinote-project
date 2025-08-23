export interface Translation {
  // Navigation
  dashboard: string;
  documents: string;
  vocabulary: string;
  collaboration: string;
  search: string;
  planning: string;
  settings: string;
  help: string;
  
  // Common
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  add: string;
  search_placeholder: string;
  loading: string;
  error: string;
  success: string;
  
  // Settings
  profile: string;
  preferences: string;
  security: string;
  data_privacy: string;
  profile_information: string;
  change_photo: string;
  full_name: string;
  email_address: string;
  role: string;
  subscription: string;
  upgrade: string;
  appearance: string;
  dark_mode: string;
  dark_mode_description: string;
  language: string;
  notifications: string;
  study_reminders: string;
  study_reminders_description: string;
  collaboration_updates: string;
  collaboration_updates_description: string;
  weekly_progress: string;
  weekly_progress_description: string;
  new_features: string;
  new_features_description: string;
  password_authentication: string;
  current_password: string;
  new_password: string;
  confirm_new_password: string;
  update_password: string;
  two_factor_authentication: string;
  authenticator_app: string;
  authenticator_app_description: string;
  enable: string;
  data_export_import: string;
  export_your_data: string;
  export_your_data_description: string;
  export: string;
  import_data: string;
  import_data_description: string;
  import: string;
  privacy_data_management: string;
  delete_account: string;
  delete_account_description: string;
  save_changes: string;
  
  // Messages
  profile_updated_success: string;
  password_updated_success: string;
  photo_updated_success: string;
  notification_setting_updated: string;
  
  // Validation
  name_email_required: string;
  invalid_email_format: string;
  all_password_fields_required: string;
  passwords_dont_match: string;
  password_min_length: string;
  
  // Plans
  choose_plan: string;
  basic: string;
  premium: string;
  recommended: string;
  current_plan: string;
  choose_basic: string;
  choose_premium: string;
  storage_10gb: string;
  advanced_collaboration: string;
  priority_support: string;
  unlimited_storage: string;
  advanced_ai: string;
  all_features: string;
  support_24_7: string;
  cancel_anytime: string;
  processing: string;
  
  // Photo upload
  change_profile_photo: string;
  jpg_png_gif_max_2mb: string;
  uploading: string;
  
  // Welcome message
  welcome: string;
}

export const translations: Record<string, Translation> = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    documents: 'My Documents',
    vocabulary: 'Vocabulary',
    collaboration: 'Collaboration',
    search: 'AI Search',
    planning: 'Planning',
    settings: 'Settings',
    help: 'Help & Support',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search_placeholder: 'Search...',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Settings
    profile: 'Profile',
    preferences: 'Preferences',
    security: 'Security',
    data_privacy: 'Data & Privacy',
    profile_information: 'Profile Information',
    change_photo: 'Change Photo',
    full_name: 'Full Name',
    email_address: 'Email Address',
    role: 'Role',
    subscription: 'Subscription',
    upgrade: 'Upgrade',
    appearance: 'Appearance',
    dark_mode: 'Dark Mode',
    dark_mode_description: 'Toggle between light and dark themes',
    language: 'Language',
    notifications: 'Notifications',
    study_reminders: 'Study Reminders',
    study_reminders_description: 'Get notified about upcoming study sessions',
    collaboration_updates: 'Collaboration Updates',
    collaboration_updates_description: 'Notifications when others share or comment',
    weekly_progress: 'Weekly Progress',
    weekly_progress_description: 'Weekly summary of your learning progress',
    new_features: 'New Features',
    new_features_description: 'Updates about new Centrinote features',
    password_authentication: 'Password & Authentication',
    current_password: 'Current Password',
    new_password: 'New Password',
    confirm_new_password: 'Confirm New Password',
    update_password: 'Update Password',
    two_factor_authentication: 'Two-Factor Authentication',
    authenticator_app: 'Authenticator App',
    authenticator_app_description: 'Use an authenticator app to generate verification codes',
    enable: 'Enable',
    data_export_import: 'Data Export & Import',
    export_your_data: 'Export Your Data',
    export_your_data_description: 'Download all your documents, vocabulary, and settings',
    export: 'Export',
    import_data: 'Import Data',
    import_data_description: 'Import data from other knowledge management tools',
    import: 'Import',
    privacy_data_management: 'Privacy & Data Management',
    delete_account: 'Delete Account',
    delete_account_description: 'Permanently delete your account and all associated data',
    save_changes: 'Save Changes',
    
    // Messages
    profile_updated_success: 'Profile updated successfully!',
    password_updated_success: 'Password updated successfully!',
    photo_updated_success: 'Profile photo updated successfully!',
    notification_setting_updated: 'Notification setting updated!',
    
    // Validation
    name_email_required: 'Name and email are required',
    invalid_email_format: 'Invalid email format',
    all_password_fields_required: 'All password fields are required',
    passwords_dont_match: 'New passwords do not match',
    password_min_length: 'New password must be at least 8 characters',
    
    // Plans
    choose_plan: 'Choose Your Plan',
    basic: 'Basic',
    premium: 'Premium',
    recommended: 'Recommended',
    current_plan: 'Current Plan',
    choose_basic: 'Choose Basic',
    choose_premium: 'Choose Premium',
    storage_10gb: '10GB Storage',
    advanced_collaboration: 'Advanced Collaboration',
    priority_support: 'Priority Support',
    unlimited_storage: 'Unlimited Storage',
    advanced_ai: 'Advanced AI (GPT-4o)',
    all_features: 'All Features',
    support_24_7: '24/7 Support',
    cancel_anytime: 'You can cancel your subscription at any time. No commitment.',
    processing: 'Processing...',
    
    // Photo upload
    change_profile_photo: 'Change Profile Photo',
    jpg_png_gif_max_2mb: 'JPG, PNG or GIF. Max size 2MB.',
    uploading: 'Uploading...',
    
    // Welcome message
    welcome: 'Welcome'
  },
  
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    documents: 'Mes Documents',
    vocabulary: 'Vocabulaire',
    collaboration: 'Collaboration',
    search: 'Recherche IA',
    planning: 'Planification',
    settings: 'Paramètres',
    help: 'Aide & Support',
    
    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    search_placeholder: 'Rechercher...',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    
    // Settings
    profile: 'Profil',
    preferences: 'Préférences',
    security: 'Sécurité',
    data_privacy: 'Données & Confidentialité',
    profile_information: 'Informations du profil',
    change_photo: 'Changer la photo',
    full_name: 'Nom complet',
    email_address: 'Adresse email',
    role: 'Rôle',
    subscription: 'Abonnement',
    upgrade: 'Mettre à niveau',
    appearance: 'Apparence',
    dark_mode: 'Mode sombre',
    dark_mode_description: 'Basculer entre les thèmes clair et sombre',
    language: 'Langue',
    notifications: 'Notifications',
    study_reminders: 'Rappels d\'étude',
    study_reminders_description: 'Être notifié des sessions d\'étude à venir',
    collaboration_updates: 'Mises à jour de collaboration',
    collaboration_updates_description: 'Notifications quand d\'autres partagent ou commentent',
    weekly_progress: 'Progrès hebdomadaire',
    weekly_progress_description: 'Résumé hebdomadaire de vos progrès d\'apprentissage',
    new_features: 'Nouvelles fonctionnalités',
    new_features_description: 'Mises à jour sur les nouvelles fonctionnalités de Centrinote',
    password_authentication: 'Mot de passe & Authentification',
    current_password: 'Mot de passe actuel',
    new_password: 'Nouveau mot de passe',
    confirm_new_password: 'Confirmer le nouveau mot de passe',
    update_password: 'Mettre à jour le mot de passe',
    two_factor_authentication: 'Authentification à deux facteurs',
    authenticator_app: 'Application d\'authentification',
    authenticator_app_description: 'Utiliser une application d\'authentification pour générer des codes de vérification',
    enable: 'Activer',
    data_export_import: 'Export & Import de données',
    export_your_data: 'Exporter vos données',
    export_your_data_description: 'Télécharger tous vos documents, vocabulaire et paramètres',
    export: 'Exporter',
    import_data: 'Importer des données',
    import_data_description: 'Importer des données d\'autres outils de gestion des connaissances',
    import: 'Importer',
    privacy_data_management: 'Confidentialité & Gestion des données',
    delete_account: 'Supprimer le compte',
    delete_account_description: 'Supprimer définitivement votre compte et toutes les données associées',
    save_changes: 'Enregistrer les modifications',
    
    // Messages
    profile_updated_success: 'Profil mis à jour avec succès !',
    password_updated_success: 'Mot de passe mis à jour avec succès !',
    photo_updated_success: 'Photo de profil mise à jour avec succès !',
    notification_setting_updated: 'Paramètre de notification mis à jour !',
    
    // Validation
    name_email_required: 'Le nom et l\'email sont obligatoires',
    invalid_email_format: 'Format d\'email invalide',
    all_password_fields_required: 'Tous les champs de mot de passe sont obligatoires',
    passwords_dont_match: 'Les nouveaux mots de passe ne correspondent pas',
    password_min_length: 'Le nouveau mot de passe doit contenir au moins 8 caractères',
    
    // Plans
    choose_plan: 'Choisissez votre plan',
    basic: 'Basique',
    premium: 'Premium',
    recommended: 'Recommandé',
    current_plan: 'Plan actuel',
    choose_basic: 'Choisir Basique',
    choose_premium: 'Choisir Premium',
    storage_10gb: 'Stockage 10GB',
    advanced_collaboration: 'Collaboration avancée',
    priority_support: 'Support prioritaire',
    unlimited_storage: 'Stockage illimité',
    advanced_ai: 'IA avancée (GPT-4o)',
    all_features: 'Toutes les fonctionnalités',
    support_24_7: 'Support 24/7',
    cancel_anytime: 'Vous pouvez annuler votre abonnement à tout moment. Aucun engagement.',
    processing: 'Traitement...',
    
    // Photo upload
    change_profile_photo: 'Changer la photo de profil',
    jpg_png_gif_max_2mb: 'JPG, PNG ou GIF. Taille max 2MB.',
    uploading: 'Téléchargement...',
    
    // Welcome message
    welcome: 'Bienvenue'
  },
  
  es: {
    // Navigation
    dashboard: 'Panel de control',
    documents: 'Mis Documentos',
    vocabulary: 'Vocabulario',
    collaboration: 'Colaboración',
    search: 'Búsqueda IA',
    planning: 'Planificación',
    settings: 'Configuración',
    help: 'Ayuda y Soporte',
    
    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Añadir',
    search_placeholder: 'Buscar...',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    
    // Settings
    profile: 'Perfil',
    preferences: 'Preferencias',
    security: 'Seguridad',
    data_privacy: 'Datos y Privacidad',
    profile_information: 'Información del perfil',
    change_photo: 'Cambiar foto',
    full_name: 'Nombre completo',
    email_address: 'Dirección de email',
    role: 'Rol',
    subscription: 'Suscripción',
    upgrade: 'Actualizar',
    appearance: 'Apariencia',
    dark_mode: 'Modo oscuro',
    dark_mode_description: 'Alternar entre temas claro y oscuro',
    language: 'Idioma',
    notifications: 'Notificaciones',
    study_reminders: 'Recordatorios de estudio',
    study_reminders_description: 'Recibir notificaciones sobre próximas sesiones de estudio',
    collaboration_updates: 'Actualizaciones de colaboración',
    collaboration_updates_description: 'Notificaciones cuando otros comparten o comentan',
    weekly_progress: 'Progreso semanal',
    weekly_progress_description: 'Resumen semanal de tu progreso de aprendizaje',
    new_features: 'Nuevas características',
    new_features_description: 'Actualizaciones sobre nuevas características de Centrinote',
    password_authentication: 'Contraseña y Autenticación',
    current_password: 'Contraseña actual',
    new_password: 'Nueva contraseña',
    confirm_new_password: 'Confirmar nueva contraseña',
    update_password: 'Actualizar contraseña',
    two_factor_authentication: 'Autenticación de dos factores',
    authenticator_app: 'Aplicación de autenticación',
    authenticator_app_description: 'Usar una aplicación de autenticación para generar códigos de verificación',
    enable: 'Habilitar',
    data_export_import: 'Exportar e Importar datos',
    export_your_data: 'Exportar tus datos',
    export_your_data_description: 'Descargar todos tus documentos, vocabulario y configuraciones',
    export: 'Exportar',
    import_data: 'Importar datos',
    import_data_description: 'Importar datos de otras herramientas de gestión del conocimiento',
    import: 'Importar',
    privacy_data_management: 'Privacidad y Gestión de datos',
    delete_account: 'Eliminar cuenta',
    delete_account_description: 'Eliminar permanentemente tu cuenta y todos los datos asociados',
    save_changes: 'Guardar cambios',
    
    // Messages
    profile_updated_success: '¡Perfil actualizado con éxito!',
    password_updated_success: '¡Contraseña actualizada con éxito!',
    photo_updated_success: '¡Foto de perfil actualizada con éxito!',
    notification_setting_updated: '¡Configuración de notificación actualizada!',
    
    // Validation
    name_email_required: 'El nombre y el email son obligatorios',
    invalid_email_format: 'Formato de email inválido',
    all_password_fields_required: 'Todos los campos de contraseña son obligatorios',
    passwords_dont_match: 'Las nuevas contraseñas no coinciden',
    password_min_length: 'La nueva contraseña debe tener al menos 8 caracteres',
    
    // Plans
    choose_plan: 'Elige tu plan',
    basic: 'Básico',
    premium: 'Premium',
    recommended: 'Recomendado',
    current_plan: 'Plan actual',
    choose_basic: 'Elegir Básico',
    choose_premium: 'Elegir Premium',
    storage_10gb: 'Almacenamiento 10GB',
    advanced_collaboration: 'Colaboración avanzada',
    priority_support: 'Soporte prioritario',
    unlimited_storage: 'Almacenamiento ilimitado',
    advanced_ai: 'IA avanzada (GPT-4o)',
    all_features: 'Todas las características',
    support_24_7: 'Soporte 24/7',
    cancel_anytime: 'Puedes cancelar tu suscripción en cualquier momento. Sin compromiso.',
    processing: 'Procesando...',
    
    // Photo upload
    change_profile_photo: 'Cambiar foto de perfil',
    jpg_png_gif_max_2mb: 'JPG, PNG o GIF. Tamaño máx 2MB.',
    uploading: 'Subiendo...',
    
    // Welcome message
    welcome: 'Bienvenido'
  },
  
  de: {
    // Navigation
    dashboard: 'Dashboard',
    documents: 'Meine Dokumente',
    vocabulary: 'Vokabular',
    collaboration: 'Zusammenarbeit',
    search: 'KI-Suche',
    planning: 'Planung',
    settings: 'Einstellungen',
    help: 'Hilfe & Support',
    
    // Common
    save: 'Speichern',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    add: 'Hinzufügen',
    search_placeholder: 'Suchen...',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    
    // Settings
    profile: 'Profil',
    preferences: 'Einstellungen',
    security: 'Sicherheit',
    data_privacy: 'Daten & Datenschutz',
    profile_information: 'Profilinformationen',
    change_photo: 'Foto ändern',
    full_name: 'Vollständiger Name',
    email_address: 'E-Mail-Adresse',
    role: 'Rolle',
    subscription: 'Abonnement',
    upgrade: 'Upgrade',
    appearance: 'Erscheinungsbild',
    dark_mode: 'Dunkler Modus',
    dark_mode_description: 'Zwischen hellen und dunklen Themen wechseln',
    language: 'Sprache',
    notifications: 'Benachrichtigungen',
    study_reminders: 'Lernerinnerungen',
    study_reminders_description: 'Benachrichtigungen über bevorstehende Lernsitzungen erhalten',
    collaboration_updates: 'Kollaborations-Updates',
    collaboration_updates_description: 'Benachrichtigungen wenn andere teilen oder kommentieren',
    weekly_progress: 'Wöchentlicher Fortschritt',
    weekly_progress_description: 'Wöchentliche Zusammenfassung Ihres Lernfortschritts',
    new_features: 'Neue Funktionen',
    new_features_description: 'Updates über neue Centrinote-Funktionen',
    password_authentication: 'Passwort & Authentifizierung',
    current_password: 'Aktuelles Passwort',
    new_password: 'Neues Passwort',
    confirm_new_password: 'Neues Passwort bestätigen',
    update_password: 'Passwort aktualisieren',
    two_factor_authentication: 'Zwei-Faktor-Authentifizierung',
    authenticator_app: 'Authentifizierungs-App',
    authenticator_app_description: 'Eine Authentifizierungs-App verwenden, um Verifizierungscodes zu generieren',
    enable: 'Aktivieren',
    data_export_import: 'Datenexport & -import',
    export_your_data: 'Ihre Daten exportieren',
    export_your_data_description: 'Alle Ihre Dokumente, Vokabeln und Einstellungen herunterladen',
    export: 'Exportieren',
    import_data: 'Daten importieren',
    import_data_description: 'Daten aus anderen Wissensmanagement-Tools importieren',
    import: 'Importieren',
    privacy_data_management: 'Datenschutz & Datenverwaltung',
    delete_account: 'Konto löschen',
    delete_account_description: 'Ihr Konto und alle zugehörigen Daten dauerhaft löschen',
    save_changes: 'Änderungen speichern',
    
    // Messages
    profile_updated_success: 'Profil erfolgreich aktualisiert!',
    password_updated_success: 'Passwort erfolgreich aktualisiert!',
    photo_updated_success: 'Profilbild erfolgreich aktualisiert!',
    notification_setting_updated: 'Benachrichtigungseinstellung aktualisiert!',
    
    // Validation
    name_email_required: 'Name und E-Mail sind erforderlich',
    invalid_email_format: 'Ungültiges E-Mail-Format',
    all_password_fields_required: 'Alle Passwort-Felder sind erforderlich',
    passwords_dont_match: 'Die neuen Passwörter stimmen nicht überein',
    password_min_length: 'Das neue Passwort muss mindestens 8 Zeichen lang sein',
    
    // Plans
    choose_plan: 'Wählen Sie Ihren Plan',
    basic: 'Basic',
    premium: 'Premium',
    recommended: 'Empfohlen',
    current_plan: 'Aktueller Plan',
    choose_basic: 'Basic wählen',
    choose_premium: 'Premium wählen',
    storage_10gb: '10GB Speicher',
    advanced_collaboration: 'Erweiterte Zusammenarbeit',
    priority_support: 'Prioritäts-Support',
    unlimited_storage: 'Unbegrenzter Speicher',
    advanced_ai: 'Erweiterte KI (GPT-4o)',
    all_features: 'Alle Funktionen',
    support_24_7: '24/7 Support',
    cancel_anytime: 'Sie können Ihr Abonnement jederzeit kündigen. Keine Verpflichtung.',
    processing: 'Verarbeitung...',
    
    // Photo upload
    change_profile_photo: 'Profilbild ändern',
    jpg_png_gif_max_2mb: 'JPG, PNG oder GIF. Max. Größe 2MB.',
    uploading: 'Hochladen...',
    
    // Welcome message
    welcome: 'Willkommen'
  }
};