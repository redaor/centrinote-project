import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

// Servir les fichiers statiques de test
app.use(express.static(__dirname));

// Route principale vers l'interface de test
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-auth-flow.html'));
});

app.listen(PORT, () => {
  console.log(`🧪 Serveur de test démarré sur http://localhost:${PORT}`);
  console.log(`📋 Interface de test: http://localhost:${PORT}`);
  console.log(`🔗 Testez l'authentification Zoom depuis cette interface`);
  console.log(`\n⚙️  Backend Zoom OAuth: http://localhost:5174`);
});