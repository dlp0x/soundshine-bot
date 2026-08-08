# Titre
feat: aligner le client bot sur la Local API RadioDJ (requests + events)

## Résumé
Le client `radioDjApi.js` côté bot appelait encore les anciennes routes (`/requests`, `/search`) qui ne correspondent plus à la Local API construite dans `radiodj-api/`. Ce sprint réaligne le client sur les vraies routes, corrige un bug qui empêchait toute authentification contre l'API, et remplace le flow `/requests add` (texte libre) par un flow basé sur bouton depuis `/requests search`, tel que discuté.

## Issues liées
_Aucune issue GitHub liée pour l'instant — travail fait directement sur `feat/radiodj-api` suite à discussion._

## Changements

### Ajouts
- `getEvents(catID)` dans `radioDjApi.js` — `GET /events?catID=`
- `getEventsSchedule(day, catID)` dans `radioDjApi.js` — `GET /events/schedule?day=&catID=`
- Handler de bouton `request_add_<songID>` dans `ButtonHandler.js`, avec messages dédiés pour 404 (morceau introuvable) et 409 (déjà demandé récemment)
- `/requests search` affiche maintenant un embed avec un bouton "Demander" par résultat (jusqu'à 10 résultats, répartis sur des rangées de 5 boutons max)
- Helpers de test `lastReplyPayload` / `lastUpdatePayload` dans `discordFactory.js`

### Modifications
- `radioDjApi.js` : `listRequests()` → `GET /requests/list` (était `/requests`), `addRequest()` → `POST /requests/add` avec `{ songID, username }` (était `{ artist, title }` sur `/requests`), `searchSongs()` → `GET /requests/search` (était `/search`)
- `requests-list.js` : l'affichage montre maintenant le nom du demandeur plutôt qu'un compte de requests (voir Corrections)
- `requests/index.js` : `/requests list` enregistré comme sous-commande

### Corrections
- **Bug live** : `RADIODJ_API_KEY` était absent du schema Zod de `config.js`, et une ligne assignait `env.RADIODJ_API_URL` à la place de `env.RADIODJ_API_KEY`. Résultat : la clé API transmise à la Local API était toujours `undefined`, ce qui aurait causé un 401 systématique en production.
- `requests-list.js` référençait un champ `r.requests` (compte de demandes) absent de la réponse de `/requests/list` (route réservée au bot, qui ne retourne pas ce compte — seule la route site web `/requests` l'inclut). Remplacé par l'affichage du demandeur (`r.username`).
- `/requests list` existait comme fichier mais n'était jamais enregistré dans `index.js` — sous-commande orpheline, invisible pour les utilisateurs Discord.

## Tests effectués

### Manuels
- Vérification manuelle de la correspondance entre chaque fonction du client et les routes/contrôleurs réels de `radiodj-api/` (lecture croisée des fichiers, pas d'environnement RadioDJ live disponible pour ce sprint)
- Vérification que le patch s'applique proprement sur un clone frais de `feat/radiodj-api` (`git apply --check`)

### Automatisés
- Suite ciblée (client API + commande requests + handler bouton) : **19/19 tests passent**
- Suite complète du projet : **86/94 passent** — les 8 échecs restants sont préexistants et sans lien avec ce sprint (module `playlist-update`/`stageTopic`), confirmés en tournant la même suite sur la branche non modifiée avant les changements. Voir section Notes.
- Lint (`eslint`) propre sur tous les fichiers modifiés

## Impact
- Le bot peut maintenant s'authentifier correctement contre la Local API (bug critique corrigé)
- `/requests search` devient le point d'entrée unique pour faire une demande (recherche + bouton), plus intuitif et évite les erreurs de saisie artiste/titre
- `/requests list` redevient utilisable (était invisible auparavant)
- Prépare le terrain pour consommer `/events` et `/events/schedule` côté bot dans un prochain sprint

## Breaking Changes
- **`/requests add` (artiste/titre en texte libre) est retirée.** Les utilisateurs devront utiliser `/requests search` puis cliquer sur "Demander". À communiquer si des utilisateurs avaient l'habitude de cette commande.
- Un redéploiement des commandes slash (`npm run deploy:dev` / `deploy:global`) sera nécessaire pour que Discord reflète le retrait de `/requests add` et l'apparition de `/requests list`.

## Validation
- [ ] Confirmer que `RADIODJ_API_KEY` est bien définie dans les `.env` de chaque environnement (dev/prod) avant déploiement — sans elle, le bot ne pourra pas contacter l'API (comportement inchangé, mais maintenant la variable est effectivement utilisée)
- [ ] Redéployer les commandes slash pour propager le retrait de `/requests add` et l'ajout de `/requests list`
- [ ] Test end-to-end contre une instance réelle de `radiodj-api` (pas fait dans ce sprint, faute d'environnement live)

## Déploiement
Aucune migration de données requise. Redéploiement des commandes slash requis (voir Validation). Le bot et l'API RadioDJ étant sur des serveurs séparés, s'assurer que `RADIODJ_API_URL` pointe vers la bonne instance avant mise en prod.

## Notes
- **Hors scope de ce sprint, à trancher séparément** : `radiodj-api/package.json` a `"main": "src/server.js"` et des scripts `start`/`dev` qui pointent vers `node src/server.js`, mais il n'y a pas de dossier `src/` dans `radiodj-api/` — `server.js` est à la racine. `npm start` va planter tel quel côté API. À corriger avant le déploiement de la Local API elle-même.
- **Hors scope, sans lien avec ce sprint** : 8 tests échouent dans `src/tests/api/playlist-update.test.js` et `src/tests/integration/api.test.js` autour du flag `stageTopic`/`social`. Confirmé préexistant sur la branche avant mes changements — à investiguer séparément si pertinent.
- Prochaine étape naturelle : consommer `getEvents`/`getEventsSchedule` dans une commande Discord (pas encore fait, le client est prêt mais rien ne l'appelle encore côté bot).
