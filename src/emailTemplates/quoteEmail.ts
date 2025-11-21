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
    <title>Citation du jour - Centrinote</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #222;
        background: #f7f7f7;
        margin: 0;
        padding: 40px 20px;
        line-height: 1.6;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
      }
      .card {
        background: #ffffff;
        border-radius: 12px;
        padding: 40px 30px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 20px;
      }
      .quote {
        font-size: 1.5em;
        line-height: 1.6;
        color: #333;
        font-style: italic;
        margin-bottom: 20px;
        text-align: center;
        padding: 20px 0;
        border-left: 4px solid #6366f1;
        padding-left: 20px;
      }
      .author {
        text-align: right;
        margin-top: 20px;
        color: #666;
        font-size: 1.1em;
        font-weight: 500;
      }
      .author::before {
        content: '— ';
        color: #999;
      }
      footer {
        margin-top: 40px;
        font-size: 0.85em;
        color: #999;
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
      }
      @media only screen and (max-width: 600px) {
        body {
          padding: 20px 10px;
        }
        .card {
          padding: 30px 20px;
        }
        .quote {
          font-size: 1.3em;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <p class="quote">« ${quoteText.replace(/"/g, '&quot;')} »</p>
        <p class="author">${author.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
      <footer>
        Centrinote – Citation du jour
      </footer>
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

