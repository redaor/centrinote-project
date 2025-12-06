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

  // Appearance & Language
  appearance_and_language: string;
  appearance_description: string;
  theme: string;
  theme_system: string;
  theme_light: string;
  theme_dark: string;
  text_size: string;
  text_size_small: string;
  text_size_medium: string;
  text_size_large: string;
  text_size_updated: string;
  language_updated: string;
  language_applied_note: string;
  language_french: string;
  language_english: string;
  language_spanish: string;
  language_german: string;
  resources: string;
  guide_user: string;
  guide_user_description: string;
  forum_community: string;
  forum_community_description: string;
  contact_support: string;
  quick_answers: string;
  contact_form_email: string;
  contact_form_subject: string;
  contact_form_message: string;
  contact_form_send: string;
  contact_form_sent: string;
  contact_form_response_time: string;
  contact_form_email_placeholder: string;
  contact_form_subject_placeholder: string;
  contact_form_message_placeholder: string;
  settings_title: string;
  settings_subtitle: string;
  settings_loading: string;
  back: string;

  // Chatbot
  chatbot_title: string;
  chatbot_subtitle: string;
  chatbot_welcome: string;
  chatbot_need_help: string;
  chatbot_open: string;
  chatbot_close: string;
  chatbot_minimize: string;
  chatbot_placeholder: string;
  chatbot_send: string;
  chatbot_error: string;
  chatbot_create_email: string;
  chatbot_email_sent: string;
  chatbot_email_error: string;

  // Help & Support
  help_support_title: string;
  help_support_subtitle: string;
  video_tutorials: string;
  video_tutorials_desc: string;
  watch_now: string;
  user_guide: string;
  user_guide_desc: string;
  read_guide: string;
  community_forum: string;
  community_forum_desc: string;
  join_community: string;
  frequently_asked_questions: string;
  search_faqs: string;
  all_topics: string;
  documents_category: string;
  vocabulary_category: string;
  ai_search_category: string;
  collaboration_category: string;
  billing_category: string;
  security_category: string;
  no_results_found: string;
  no_results_desc: string;
  still_need_help: string;
  still_need_help_desc: string;
  live_chat: string;
  email_support: string;
  schedule_call: string;

  // FAQ Questions
  faq_import_documents_q: string;
  faq_import_documents_a: string;
  faq_ai_search_q: string;
  faq_ai_search_a: string;
  faq_collaboration_q: string;
  faq_collaboration_a: string;
  faq_flashcards_q: string;
  faq_flashcards_a: string;
  faq_subscription_q: string;
  faq_subscription_a: string;
  faq_security_q: string;
  faq_security_a: string;
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
    welcome: 'Welcome',
    settings_title: 'Settings',
    settings_subtitle: 'Manage your preferences and account',
    settings_loading: 'Loading settings...',
    back: 'Back',

    // Help & Support
    help_support_title: 'Help & Support',
    help_support_subtitle: 'Find answers to your questions and get the help you need',
    video_tutorials: 'Video Tutorials',
    video_tutorials_desc: 'Watch step-by-step guides to master Centrinote features',
    watch_now: 'Watch Now',
    user_guide: 'User Guide',
    user_guide_desc: 'Comprehensive documentation for all features',
    read_guide: 'Read Guide',
    community_forum: 'Community Forum',
    community_forum_desc: 'Connect with other users and share tips',
    join_community: 'Join Community',
    frequently_asked_questions: 'Frequently Asked Questions',
    search_faqs: 'Search FAQs...',
    all_topics: 'All Topics',
    documents_category: 'Documents',
    vocabulary_category: 'Vocabulary',
    ai_search_category: 'AI Search',
    collaboration_category: 'Collaboration',
    billing_category: 'Billing',
    security_category: 'Security',
    no_results_found: 'No results found',
    no_results_desc: 'Try adjusting your search terms or browse all categories.',
    still_need_help: 'Still need help?',
    still_need_help_desc: 'Our support team is here to help you get the most out of Centrinote',
    live_chat: 'Live Chat',
    email_support: 'Email Support',
    schedule_call: 'Schedule Call',

    // FAQ Questions
    faq_import_documents_q: 'How do I import documents into Centrinote?',
    faq_import_documents_a: 'You can import documents by clicking the "Add Document" button in the Documents section. Supported formats include PDF, Word, images, and audio files. You can also drag and drop files directly into the interface.',
    faq_ai_search_q: 'How does the AI search feature work?',
    faq_ai_search_a: 'The AI search uses advanced natural language processing to understand your queries and search across all your content. It can find relevant documents, vocabulary entries, and provide intelligent suggestions based on context.',
    faq_collaboration_q: 'Can I collaborate with others in real-time?',
    faq_collaboration_a: 'Yes! Centrinote supports real-time collaboration. You can share documents, create study sessions with others, and use the built-in chat and video features to work together seamlessly.',
    faq_flashcards_q: 'How do I create and manage vocabulary flashcards?',
    faq_flashcards_a: 'Go to the Vocabulary section and click "Add Word" to create new entries. You can organize words by category, set difficulty levels, and use the flashcard mode for studying. The system tracks your progress automatically.',
    faq_subscription_q: 'What subscription plans are available?',
    faq_subscription_a: 'We offer three plans: Free (basic features), Basic (€5-10/month with advanced features), and Premium (€10+/month with full AI capabilities and unlimited storage). Early adopters get 50% off for life!',
    faq_security_q: 'Is my data secure and private?',
    faq_security_a: 'Absolutely. We use enterprise-grade encryption, comply with GDPR regulations, and never share your personal data. You have full control over your information and can export or delete it at any time.'
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
    welcome: 'Bienvenue',

    // Appearance & Language
    appearance_and_language: 'Apparence & Langue',
    appearance_description: 'Personnalisez l\'apparence de l\'interface',
    theme: 'Thème',
    theme_system: 'Système',
    theme_light: 'Clair',
    theme_dark: 'Sombre',
    text_size: 'Taille du texte',
    text_size_small: 'Petit',
    text_size_medium: 'Moyen',
    text_size_large: 'Grand',
    text_size_updated: 'Taille du texte mise à jour',
    language_updated: 'Langue mise à jour avec succès',
    language_applied_note: 'La langue sera appliquée immédiatement pour les éléments traduits',
    language_french: 'Français',
    language_english: 'Anglais',
    language_spanish: 'Espagnol',
    language_german: 'Allemand',
    resources: 'Ressources',
    guide_user: 'Guide utilisateur',
    guide_user_description: 'Documentation complète de toutes les fonctionnalités',
    forum_community: 'Forum communautaire',
    forum_community_description: 'Échangez avec d\'autres utilisateurs et partagez vos astuces',
    contact_support: 'Contacter le support',
    quick_answers: 'Réponses rapides',
    contact_form_email: 'Email',
    contact_form_subject: 'Sujet',
    contact_form_message: 'Message',
    contact_form_send: 'Envoyer',
    contact_form_sent: 'Message envoyé !',
    contact_form_response_time: 'Nous vous répondrons sous 24h',
    contact_form_email_placeholder: 'votre@email.com',
    contact_form_subject_placeholder: 'Résumé de votre question',
    contact_form_message_placeholder: 'Décrivez votre question en détail...',
    settings_title: 'Paramètres',
    settings_subtitle: 'Gérez vos préférences et votre compte',
    settings_loading: 'Chargement des paramètres...',
    back: 'Retour',
    chatbot_title: 'Assistant Centrinote',
    chatbot_subtitle: 'Je suis là pour vous aider',
    chatbot_welcome: 'Bonjour ! Je suis l\'assistant Centrinote. Comment puis-je vous aider aujourd\'hui ?',
    chatbot_need_help: 'Besoin d\'aide ?',
    chatbot_open: 'Ouvrir le chatbot',
    chatbot_close: 'Fermer',
    chatbot_minimize: 'Réduire',
    chatbot_placeholder: 'Tapez votre message...',
    chatbot_send: 'Envoyer',
    chatbot_error: 'Désolé, une erreur s\'est produite. Voulez-vous que je vous aide à rédiger un email à notre équipe de support ?',
    chatbot_create_email: 'Créer un email de support',
    chatbot_email_sent: 'Email envoyé avec succès ! Ticket {ticketId} créé. Notre équipe vous répondra sous 24h.',
    chatbot_email_error: 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.',

    // Help & Support
    help_support_title: 'Aide & Support',
    help_support_subtitle: 'Trouvez des réponses à vos questions et obtenez l\'aide dont vous avez besoin',
    video_tutorials: 'Tutoriels Vidéo',
    video_tutorials_desc: 'Regardez des guides étape par étape pour maîtriser les fonctionnalités de Centrinote',
    watch_now: 'Regarder Maintenant',
    user_guide: 'Guide Utilisateur',
    user_guide_desc: 'Documentation complète pour toutes les fonctionnalités',
    read_guide: 'Lire le Guide',
    community_forum: 'Forum Communautaire',
    community_forum_desc: 'Connectez-vous avec d\'autres utilisateurs et partagez des astuces',
    join_community: 'Rejoindre la Communauté',
    frequently_asked_questions: 'Questions Fréquemment Posées',
    search_faqs: 'Rechercher dans les FAQs...',
    all_topics: 'Tous les Sujets',
    documents_category: 'Documents',
    vocabulary_category: 'Vocabulaire',
    ai_search_category: 'Recherche IA',
    collaboration_category: 'Collaboration',
    billing_category: 'Facturation',
    security_category: 'Sécurité',
    no_results_found: 'Aucun résultat trouvé',
    no_results_desc: 'Essayez d\'ajuster vos termes de recherche ou parcourez toutes les catégories.',
    still_need_help: 'Vous avez encore besoin d\'aide ?',
    still_need_help_desc: 'Notre équipe de support est là pour vous aider à tirer le meilleur parti de Centrinote',
    live_chat: 'Chat en Direct',
    email_support: 'Support par Email',
    schedule_call: 'Planifier un Appel',

    // FAQ Questions
    faq_import_documents_q: 'Comment importer des documents dans Centrinote ?',
    faq_import_documents_a: 'Vous pouvez importer des documents en cliquant sur le bouton "Ajouter un Document" dans la section Documents. Les formats supportés incluent PDF, Word, images et fichiers audio. Vous pouvez également glisser-déposer des fichiers directement dans l\'interface.',
    faq_ai_search_q: 'Comment fonctionne la recherche IA ?',
    faq_ai_search_a: 'La recherche IA utilise un traitement du langage naturel avancé pour comprendre vos requêtes et rechercher dans tout votre contenu. Elle peut trouver des documents pertinents, des entrées de vocabulaire et fournir des suggestions intelligentes basées sur le contexte.',
    faq_collaboration_q: 'Puis-je collaborer avec d\'autres en temps réel ?',
    faq_collaboration_a: 'Oui ! Centrinote prend en charge la collaboration en temps réel. Vous pouvez partager des documents, créer des sessions d\'étude avec d\'autres et utiliser les fonctionnalités de chat et vidéo intégrées pour travailler ensemble de manière transparente.',
    faq_flashcards_q: 'Comment créer et gérer des cartes de vocabulaire ?',
    faq_flashcards_a: 'Allez dans la section Vocabulaire et cliquez sur "Ajouter un Mot" pour créer de nouvelles entrées. Vous pouvez organiser les mots par catégorie, définir des niveaux de difficulté et utiliser le mode carte pour étudier. Le système suit automatiquement vos progrès.',
    faq_subscription_q: 'Quels sont les plans d\'abonnement disponibles ?',
    faq_subscription_a: 'Nous proposons trois plans : Gratuit (fonctionnalités de base), Basique (5-10€/mois avec fonctionnalités avancées) et Premium (10€+/mois avec toutes les capacités IA et stockage illimité). Les premiers adoptants bénéficient de 50% de réduction à vie !',
    faq_security_q: 'Mes données sont-elles sécurisées et privées ?',
    faq_security_a: 'Absolument. Nous utilisons un chiffrement de niveau entreprise, respectons les réglementations RGPD et ne partageons jamais vos données personnelles. Vous avez un contrôle total sur vos informations et pouvez les exporter ou les supprimer à tout moment.'
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
    welcome: 'Bienvenido',

    // Appearance & Language
    appearance_and_language: 'Apariencia e Idioma',
    appearance_description: 'Personaliza la apariencia de la interfaz',
    theme: 'Tema',
    theme_system: 'Sistema',
    theme_light: 'Claro',
    theme_dark: 'Oscuro',
    text_size: 'Tamaño del texto',
    text_size_small: 'Pequeño',
    text_size_medium: 'Mediano',
    text_size_large: 'Grande',
    text_size_updated: 'Tamaño del texto actualizado',
    language_updated: 'Idioma actualizado con éxito',
    language_applied_note: 'El idioma se aplicará inmediatamente para los elementos traducidos',
    language_french: 'Francés',
    language_english: 'Inglés',
    language_spanish: 'Español',
    language_german: 'Alemán',
    resources: 'Recursos',
    guide_user: 'Guía del Usuario',
    guide_user_description: 'Documentación completa para todas las funciones',
    forum_community: 'Foro de la Comunidad',
    forum_community_description: 'Conéctate con otros usuarios y comparte consejos',
    contact_support: 'Contactar Soporte',
    quick_answers: 'Respuestas Rápidas',
    contact_form_email: 'Email',
    contact_form_subject: 'Asunto',
    contact_form_message: 'Mensaje',
    contact_form_send: 'Enviar',
    contact_form_sent: '¡Mensaje enviado!',
    contact_form_response_time: 'Te responderemos en 24 horas',
    contact_form_email_placeholder: 'tu@email.com',
    contact_form_subject_placeholder: 'Resumen de tu pregunta',
    contact_form_message_placeholder: 'Describe tu pregunta en detalle...',
    settings_title: 'Configuración',
    settings_subtitle: 'Administra tus preferencias y cuenta',
    settings_loading: 'Cargando configuración...',
    back: 'Volver',

    // Help & Support
    help_support_title: 'Ayuda y Soporte',
    help_support_subtitle: 'Encuentra respuestas a tus preguntas y obtén la ayuda que necesitas',
    video_tutorials: 'Tutoriales en Video',
    video_tutorials_desc: 'Mira guías paso a paso para dominar las funciones de Centrinote',
    watch_now: 'Ver Ahora',
    user_guide: 'Guía del Usuario',
    user_guide_desc: 'Documentación completa para todas las funciones',
    read_guide: 'Leer Guía',
    community_forum: 'Foro de la Comunidad',
    community_forum_desc: 'Conéctate con otros usuarios y comparte consejos',
    join_community: 'Unirse a la Comunidad',
    frequently_asked_questions: 'Preguntas Frecuentes',
    search_faqs: 'Buscar en FAQs...',
    all_topics: 'Todos los Temas',
    documents_category: 'Documentos',
    vocabulary_category: 'Vocabulario',
    ai_search_category: 'Búsqueda IA',
    collaboration_category: 'Colaboración',
    billing_category: 'Facturación',
    security_category: 'Seguridad',
    no_results_found: 'No se encontraron resultados',
    no_results_desc: 'Intenta ajustar tus términos de búsqueda o explora todas las categorías.',
    still_need_help: '¿Aún necesitas ayuda?',
    still_need_help_desc: 'Nuestro equipo de soporte está aquí para ayudarte a aprovechar al máximo Centrinote',
    live_chat: 'Chat en Vivo',
    email_support: 'Soporte por Email',
    schedule_call: 'Programar Llamada',

    // FAQ Questions
    faq_import_documents_q: '¿Cómo importo documentos en Centrinote?',
    faq_import_documents_a: 'Puedes importar documentos haciendo clic en el botón "Añadir Documento" en la sección de Documentos. Los formatos compatibles incluyen PDF, Word, imágenes y archivos de audio. También puedes arrastrar y soltar archivos directamente en la interfaz.',
    faq_ai_search_q: '¿Cómo funciona la búsqueda IA?',
    faq_ai_search_a: 'La búsqueda IA utiliza procesamiento avanzado del lenguaje natural para comprender tus consultas y buscar en todo tu contenido. Puede encontrar documentos relevantes, entradas de vocabulario y proporcionar sugerencias inteligentes basadas en el contexto.',
    faq_collaboration_q: '¿Puedo colaborar con otros en tiempo real?',
    faq_collaboration_a: '¡Sí! Centrinote admite colaboración en tiempo real. Puedes compartir documentos, crear sesiones de estudio con otros y usar las funciones integradas de chat y video para trabajar juntos sin problemas.',
    faq_flashcards_q: '¿Cómo creo y gestiono tarjetas de vocabulario?',
    faq_flashcards_a: 'Ve a la sección de Vocabulario y haz clic en "Añadir Palabra" para crear nuevas entradas. Puedes organizar palabras por categoría, establecer niveles de dificultad y usar el modo tarjeta para estudiar. El sistema rastrea tu progreso automáticamente.',
    faq_subscription_q: '¿Qué planes de suscripción están disponibles?',
    faq_subscription_a: 'Ofrecemos tres planes: Gratuito (funciones básicas), Básico (€5-10/mes con funciones avanzadas) y Premium (€10+/mes con todas las capacidades de IA y almacenamiento ilimitado). ¡Los primeros usuarios obtienen 50% de descuento de por vida!',
    faq_security_q: '¿Mis datos son seguros y privados?',
    faq_security_a: 'Absolutamente. Usamos cifrado de nivel empresarial, cumplimos con las regulaciones GDPR y nunca compartimos tus datos personales. Tienes control total sobre tu información y puedes exportarla o eliminarla en cualquier momento.'
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
    welcome: 'Willkommen',

    // Appearance & Language
    appearance_and_language: 'Erscheinungsbild & Sprache',
    appearance_description: 'Passen Sie das Erscheinungsbild der Benutzeroberfläche an',
    theme: 'Thema',
    theme_system: 'System',
    theme_light: 'Hell',
    theme_dark: 'Dunkel',
    text_size: 'Textgröße',
    text_size_small: 'Klein',
    text_size_medium: 'Mittel',
    text_size_large: 'Groß',
    text_size_updated: 'Textgröße aktualisiert',
    language_updated: 'Sprache erfolgreich aktualisiert',
    language_applied_note: 'Die Sprache wird sofort für übersetzte Elemente angewendet',
    language_french: 'Französisch',
    language_english: 'Englisch',
    language_spanish: 'Spanisch',
    language_german: 'Deutsch',
    resources: 'Ressourcen',
    guide_user: 'Benutzerhandbuch',
    guide_user_description: 'Umfassende Dokumentation für alle Funktionen',
    forum_community: 'Community-Forum',
    forum_community_description: 'Verbinden Sie sich mit anderen Benutzern und teilen Sie Tipps',
    contact_support: 'Support Kontaktieren',
    quick_answers: 'Schnelle Antworten',
    contact_form_email: 'E-Mail',
    contact_form_subject: 'Betreff',
    contact_form_message: 'Nachricht',
    contact_form_send: 'Senden',
    contact_form_sent: 'Nachricht gesendet!',
    contact_form_response_time: 'Wir werden Ihnen innerhalb von 24 Stunden antworten',
    contact_form_email_placeholder: 'ihre@email.com',
    contact_form_subject_placeholder: 'Zusammenfassung Ihrer Frage',
    contact_form_message_placeholder: 'Beschreiben Sie Ihre Frage im Detail...',
    settings_title: 'Einstellungen',
    settings_subtitle: 'Verwalten Sie Ihre Präferenzen und Ihr Konto',
    settings_loading: 'Einstellungen werden geladen...',
    back: 'Zurück',
    chatbot_title: 'Centrinote Assistent',
    chatbot_subtitle: 'Ich bin hier, um zu helfen',
    chatbot_welcome: 'Hallo! Ich bin der Centrinote-Assistent. Wie kann ich Ihnen heute helfen?',
    chatbot_need_help: 'Brauchen Sie Hilfe?',
    chatbot_open: 'Chatbot öffnen',
    chatbot_close: 'Schließen',
    chatbot_minimize: 'Minimieren',
    chatbot_placeholder: 'Geben Sie Ihre Nachricht ein...',
    chatbot_send: 'Senden',
    chatbot_error: 'Entschuldigung, ein Fehler ist aufgetreten. Möchten Sie, dass ich Ihnen beim Verfassen einer E-Mail an unser Support-Team helfe?',
    chatbot_create_email: 'Support-E-Mail erstellen',
    chatbot_email_sent: 'E-Mail erfolgreich gesendet! Ticket {ticketId} erstellt. Unser Team wird innerhalb von 24 Stunden antworten.',
    chatbot_email_error: 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut.',

    // Help & Support
    help_support_title: 'Hilfe & Support',
    help_support_subtitle: 'Finden Sie Antworten auf Ihre Fragen und erhalten Sie die Hilfe, die Sie benötigen',
    video_tutorials: 'Video-Tutorials',
    video_tutorials_desc: 'Schauen Sie sich Schritt-für-Schritt-Anleitungen an, um die Funktionen von Centrinote zu meistern',
    watch_now: 'Jetzt Ansehen',
    user_guide: 'Benutzerhandbuch',
    user_guide_desc: 'Umfassende Dokumentation für alle Funktionen',
    read_guide: 'Handbuch Lesen',
    community_forum: 'Community-Forum',
    community_forum_desc: 'Verbinden Sie sich mit anderen Benutzern und teilen Sie Tipps',
    join_community: 'Community Beitreten',
    frequently_asked_questions: 'Häufig Gestellte Fragen',
    search_faqs: 'FAQs durchsuchen...',
    all_topics: 'Alle Themen',
    documents_category: 'Dokumente',
    vocabulary_category: 'Vokabular',
    ai_search_category: 'KI-Suche',
    collaboration_category: 'Zusammenarbeit',
    billing_category: 'Abrechnung',
    security_category: 'Sicherheit',
    no_results_found: 'Keine Ergebnisse gefunden',
    no_results_desc: 'Versuchen Sie, Ihre Suchbegriffe anzupassen oder durchsuchen Sie alle Kategorien.',
    still_need_help: 'Benötigen Sie noch Hilfe?',
    still_need_help_desc: 'Unser Support-Team ist hier, um Ihnen zu helfen, das Beste aus Centrinote herauszuholen',
    live_chat: 'Live-Chat',
    email_support: 'E-Mail-Support',
    schedule_call: 'Anruf Planen',

    // FAQ Questions
    faq_import_documents_q: 'Wie importiere ich Dokumente in Centrinote?',
    faq_import_documents_a: 'Sie können Dokumente importieren, indem Sie auf die Schaltfläche "Dokument hinzufügen" im Dokumenten-Bereich klicken. Unterstützte Formate sind PDF, Word, Bilder und Audiodateien. Sie können auch Dateien direkt in die Oberfläche ziehen und ablegen.',
    faq_ai_search_q: 'Wie funktioniert die KI-Suchfunktion?',
    faq_ai_search_a: 'Die KI-Suche verwendet fortschrittliche natürliche Sprachverarbeitung, um Ihre Anfragen zu verstehen und Ihren gesamten Inhalt zu durchsuchen. Sie kann relevante Dokumente und Vokabeleinträge finden und intelligente Vorschläge basierend auf dem Kontext geben.',
    faq_collaboration_q: 'Kann ich mit anderen in Echtzeit zusammenarbeiten?',
    faq_collaboration_a: 'Ja! Centrinote unterstützt Echtzeit-Zusammenarbeit. Sie können Dokumente teilen, Lernsitzungen mit anderen erstellen und die integrierten Chat- und Videofunktionen verwenden, um nahtlos zusammenzuarbeiten.',
    faq_flashcards_q: 'Wie erstelle und verwalte ich Vokabel-Flashcards?',
    faq_flashcards_a: 'Gehen Sie zum Vokabular-Bereich und klicken Sie auf "Wort hinzufügen", um neue Einträge zu erstellen. Sie können Wörter nach Kategorie organisieren, Schwierigkeitsgrade festlegen und den Karteikarten-Modus zum Lernen verwenden. Das System verfolgt automatisch Ihren Fortschritt.',
    faq_subscription_q: 'Welche Abonnement-Pläne sind verfügbar?',
    faq_subscription_a: 'Wir bieten drei Pläne an: Kostenlos (Grundfunktionen), Basic (€5-10/Monat mit erweiterten Funktionen) und Premium (€10+/Monat mit allen KI-Funktionen und unbegrenztem Speicher). Frühe Nutzer erhalten 50% Rabatt auf Lebenszeit!',
    faq_security_q: 'Sind meine Daten sicher und privat?',
    faq_security_a: 'Absolut. Wir verwenden Verschlüsselung auf Unternehmensebene, halten uns an DSGVO-Vorschriften und geben Ihre persönlichen Daten niemals weiter. Sie haben volle Kontrolle über Ihre Informationen und können sie jederzeit exportieren oder löschen.'
  }
};