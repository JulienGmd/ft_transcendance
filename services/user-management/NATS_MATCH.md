# 🎮 NATS Match System

Ce système permet d'ajouter des résultats de match via NATS, permettant aux autres services (comme le service de jeu) de communiquer avec le service d'authentification sans appels HTTP directs.

## 📡 Topics disponibles

### `match.create` (Request/Response)
Crée un nouveau match dans la base de données.

**Payload:**
```json
{
  "player1Id": 2,
  "player2Id": 3,
  "precisionPlayer1": 88.5,
  "precisionPlayer2": 75.2,
  "scoreP1": 10,
  "scoreP2": 7
}
```

**Response (Success):**
```json
{
  "success": true,
  "match": {
    "id": 123,
    "player1_id": 2,
    "player2_id": 3,
    "player1_score": 10,
    "player2_score": 7,
    "winner_id": 2,
    "created_at": "2025-11-27T12:34:56.789Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

### `match.created` (Publish only)
Événement publié automatiquement après la création d'un match. Autres services peuvent s'abonner pour être notifiés.

**Payload:**
```json
{
  "id": 123,
  "player1_id": 2,
  "player2_id": 3,
  "player1_score": 10,
  "player2_score": 7,
  "winner_id": 2,
  "created_at": "2025-11-27T12:34:56.789Z"
}
```

## 🧪 Tester le système

### 1. Démarrer les services
```bash
docker compose up -d
```

### 2. Tester la création de match via NATS
```bash
docker exec ft_transcendance-auth-1 npx tsx src/nats/testMatchCreate.ts
```

### 3. Vérifier les logs
```bash
docker logs ft_transcendance-auth-1 --tail 50
```

## 🔌 Utilisation depuis un autre service

### Exemple en TypeScript/Node.js

```typescript
import { connect, StringCodec } from "nats";

const codec = StringCodec();

async function createMatch(
  player1Id: number,
  player2Id: number,
  precisionPlayer1: number,
  precisionPlayer2: number,
  scoreP1: number,
  scoreP2: number
) {
  const nc = await connect({ servers: "nats://nats:4222" });
  
  const matchData = {
    player1Id,
    player2Id,
    precisionPlayer1,
    precisionPlayer2,
    scoreP1,
    scoreP2,
  };
  
  const response = await nc.request(
    "match.create",
    codec.encode(JSON.stringify(matchData)),
    { timeout: 5000 }
  );
  
  const result = JSON.parse(codec.decode(response.data));
  
  await nc.close();
  
  return result;
}

// Utilisation
const result = await createMatch(2, 3, 88.5, 75.2, 10, 7);
if (result.success) {
  console.log("Match created:", result.match.id);
} else {
  console.error("Error:", result.error);
}
```

## 🎯 Avantages de NATS

1. **Découplage**: Les services ne se connaissent pas directement
2. **Résilience**: Si le service auth est temporairement down, les messages peuvent être mis en queue
3. **Performance**: Communication plus rapide que HTTP
4. **Scalabilité**: Facile d'ajouter plusieurs instances du même service

## 🔧 Configuration

Le service auth se connecte automatiquement à NATS au démarrage. L'URL de connexion peut être configurée via la variable d'environnement `NATS_URL` (par défaut: `nats://nats:4222` dans Docker).

Si NATS n'est pas disponible, le service continuera de fonctionner avec seulement les routes HTTP.
