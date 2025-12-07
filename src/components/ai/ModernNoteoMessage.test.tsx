/**
 * Test du parsing avec un exemple réel
 */

import { modernNoteoService } from '../../services/modernNoteoService';

// Exemple de message réel
const exampleMessage = `Bien sûr, je serais ravi de vous aider à créer une réunion ! Pour cela, il vous suffit de suivre ces étapes :

1. **Accédez à la section des réunions** : Ouvrez votre application Centrinote et recherchez l'option pour créer une réunion. Cela peut être sous "📅 Planning" ou dans un menu dédié.

2. **Choisissez le type de réunion** : Vous pouvez opter pour une réunion via Jitsi Meet ou Zoom. Sélectionnez celui que vous préférez.

3. **Remplissez les détails** : Indiquez le titre de la réunion, la date, l'heure et éventuellement une description si vous le souhaitez. N'oubliez pas de choisir la durée de la réunion.

4. **Invitez des participants** : Entrez les adresses e-mail des personnes que vous souhaitez inviter. Si vous êtes en version Pro, vous pouvez inviter autant de collaborateurs que vous le souhaitez.

5. **Envoyez les invitations** : Une fois que tout est en ordre, cliquez sur "Envoyer" ou "Créer" pour finaliser la réunion. Les participants recevront un lien pour rejoindre.

Si vous rencontrez des étapes spécifiques qui vous posent problème, n'hésitez pas à me le dire, je vous aiderai avec plaisir !

Est-ce que votre problème est résolu ?

✅ Oui, c'est réglé

❌ Non, toujours bloqué`;

// Test du parsing
export function testParsing() {
  const segments = modernNoteoService.parseTextToSegments(exampleMessage, 'Reda');
  
  console.log('Segments parsés:', segments);
  console.log('Nombre de segments:', segments.length);
  
  segments.forEach((segment, index) => {
    console.log(`\nSegment ${index + 1}:`);
    console.log(`  Time: ${segment.time}`);
    console.log(`  Emoji: ${segment.emoji}`);
    console.log(`  Title: ${segment.title}`);
    console.log(`  Content: ${segment.content.substring(0, 50)}...`);
  });
  
  return segments;
}

