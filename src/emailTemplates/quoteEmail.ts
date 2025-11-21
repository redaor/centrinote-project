// =====================================================
// Quote Email Template - Template HTML pour les citations
// Design propre et responsive
// =====================================================

import { Quote } from '../lib/quoteService';

/**
 * Génère le HTML pour un email de citation
 * @param quote Citation à afficher
 * @returns HTML string
 */
export const quoteEmail = (quote: Quote): string => {
  const quoteText = quote.quote || '';
  const author = quote.author || 'Anonyme';

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>💭 Citation du jour - Centrinote</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background: linear-gradient(to bottom, #e3f2fd 0%, #f5f5f5 100%);
        margin: 0;
        padding: 40px 20px;
        line-height: 1.6;
      }
      .email-wrapper {
        max-width: 600px;
        margin: 0 auto;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .header-icon {
        font-size: 48px;
        margin-bottom: 10px;
      }
      .header-title {
        color: #1e40af;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 5px;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
      }
      .header-subtitle {
        color: #64748b;
        font-size: 14px;
        font-weight: 400;
      }
      .card {
        background: #ffffff;
        border-radius: 20px;
        padding: 50px 40px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        margin-bottom: 30px;
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      }
      .quote-icon {
        text-align: center;
        font-size: 32px;
        margin-bottom: 25px;
        opacity: 0.3;
      }
      .quote {
        font-size: 1.75em;
        line-height: 1.8;
        color: #1f2937;
        font-style: italic;
        margin-bottom: 30px;
        text-align: center;
        padding: 30px 20px;
        position: relative;
        font-weight: 400;
      }
      .quote::before {
        content: '"';
        position: absolute;
        top: -10px;
        left: 10px;
        font-size: 4em;
        color: #e5e7eb;
        font-family: Georgia, serif;
        line-height: 1;
      }
      .quote::after {
        content: '"';
        position: absolute;
        bottom: -30px;
        right: 10px;
        font-size: 4em;
        color: #e5e7eb;
        font-family: Georgia, serif;
        line-height: 1;
      }
      .author-container {
        text-align: center;
        margin-top: 30px;
        padding-top: 25px;
        border-top: 2px solid #f3f4f6;
      }
      .author-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #9ca3af;
        margin-bottom: 8px;
        font-weight: 600;
      }
      .author {
        color: #4b5563;
        font-size: 1.15em;
        font-weight: 500;
        font-style: normal;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
      }
      .footer-brand {
        color: #475569;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .footer-tagline {
        color: #64748b;
        font-size: 13px;
        font-weight: 400;
      }
      .footer-divider {
        width: 60px;
        height: 3px;
        background: #cbd5e1;
        border-radius: 2px;
        margin: 20px auto;
      }
      @media only screen and (max-width: 600px) {
        body {
          padding: 20px 10px;
        }
        .card {
          padding: 35px 25px;
          border-radius: 16px;
        }
        .quote {
          font-size: 1.4em;
          padding: 25px 15px;
        }
        .header-title {
          font-size: 20px;
        }
        .quote-icon {
          font-size: 28px;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="header">
        <div class="header-icon">💭</div>
        <div class="header-title">Citation du jour</div>
        <div class="header-subtitle">Votre dose quotidienne de motivation</div>
      </div>
      
      <div class="card">
        <div class="quote-icon">✨</div>
        <p class="quote">${quoteText.replace(/"/g, '&quot;')}</p>
        <div class="author-container">
          <div class="author-label">Auteur</div>
          <p class="author">${author.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-divider"></div>
        <div class="footer-brand">Centrinote</div>
        <div class="footer-tagline">Votre assistant d'étude intelligent</div>
      </div>
    </div>
  </body>
</html>`;
};

/**
 * Génère le texte brut pour un email de citation
 * @param quote Citation à afficher
 * @returns Text string
 */
export const quoteEmailText = (quote: Quote): string => {
  const quoteText = quote.quote || '';
  const author = quote.author || 'Anonyme';
  return `${quoteText}\n\n— ${author}\n\nCentrinote – Citation du jour`;
};

