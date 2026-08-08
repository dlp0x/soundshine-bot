# Scripts utilitaires

Les scripts du projet sont regroupes par usage. Ils sont appeles soit depuis `package.json`, soit directement en ligne de commande.

## Structure

```text
scripts/
|-- bot/    # Deploiement et maintenance des commandes Discord
|-- dev/    # Outils de developpement et lancement de suites locales
|-- git/    # Scripts de verification proches de la CI
|-- infra/  # Verifications et helpers d'environnement
`-- tools/  # Outils divers de contexte et d'administration
```

## Scripts relies a npm

- `scripts/bot/deploy-commands.js`: utilise par `npm run deploy:dev`, `deploy:global`, `clear:dev`, `clear:global`
- `scripts/dev/init-db.js`: utilise par `npm run db:deploy`
- `scripts/dev/run-tests.js`: utilise par `npm run test:all`
- `scripts/git/git-actions.js`: utilise par `npm run git-actions`
- `scripts/infra/security-check.js`: utilise par `npm run security:audit` et `npm run security:check`
- `scripts/tools/projectContext.js`: utilise par `npm run context`, `context:md`, `context:full`

## Notes

- Les fichiers divers poses a la racine de `scripts/` ne font pas partie du workflow npm principal.
- La source de verite pour le lint et les tests est maintenant sous `src/config/`.
