# 📡 NATS - Guide d'utilisation dans le Gateway

Ce document explique comment gérer les **topics NATS** dans le projet, ainsi que publier et souscrire aux messages.

---

## 🔖 1. Organisation des Topics

Pour ajouter un nouveau Topics go dans `gateway-service/src/messaging/topics.ts` :

```ts
// src/messaging/topics.ts
export const Topics = {
  AUTH: {
    LOGIN: "auth.login",
    REGISTER: "auth.register",
    LOGOUT: "auth.logout",
  },
  USER: {
    CREATED: "user.created",
    UPDATED: "user.updated",
    DELETED: "user.deleted",
  },
};
```

👉 On garde une **chaînes magiques** et ez pour que tlm puisse l'expliquer et le comprendre

---

## 📤 2. Publier un message

On utilise `app.nats.publish(subject, data)` pour publier un message sans attendre de réponse (**fire & forget**).

```ts
import { Topics } from "@messaging/topics";

// Exemple : notifier la création d’un user
app.nats.publish(Topics.USER.CREATED, { id: 123, email: "test@mail.com" });
```

---

## 📩 3. Requête / Réponse (RPC)

Pour demander une réponse d’un microservice, on utilise `app.nats.request(subject, data)` :

```ts
import { Topics } from "@messaging/topics";

// Exemple : requête de login
const response = await app.nats.request(Topics.AUTH.LOGIN, {
  email: "test@mail.com",
  password: "123456",
});

console.log("Réponse du service Auth:", response);
```

⚠️ Si le service destinataire ne répond pas dans le délai (par défaut **2000ms**), une erreur est levée. (à personnaliser j'ai pas encore dig)

---

## 📡 4. Souscrire à un Topic (côté microservice)

Un microservice peut écouter un sujet via `nc.subscribe` :

```ts
import { connect, StringCodec } from "nats";
import { Topics } from "./topics";

const codec = StringCodec();

async function bootstrap() {
  const nc = await connect({ servers: "nats://localhost:4222" });

  // Exemple : subscriber au login
  const sub = nc.subscribe(Topics.AUTH.LOGIN);
  for await (const msg of sub) {
    const data = JSON.parse(codec.decode(msg.data));
    console.log("Requête reçue:", data);

    // Réponse au gateway
    const result = { success: true, userId: 42 };
    msg.respond(codec.encode(JSON.stringify(result)));
  }
}

bootstrap();
```

---

## ✅ 5. Bonnes pratiques

- **Convention de nommage** : `domaine.action` (ex: `auth.login`, `user.created`).
- **Centraliser** les topics dans `topics.ts`.
- **Tiper les payloads** (`LoginRequest`, `LoginResponse`, etc.) pour éviter les erreurs.

---

## 🚀 Exemple de Flux complet A VENIR J'AI PAS FINI ZEBI

1. **Front** → `POST /auth/login`
2. **Gateway** → publie une requête `auth.login`
3. **Auth Service** → écoute `auth.login`, traite la requête et répond
4. **Gateway** → renvoie la réponse HTTP au front

---


