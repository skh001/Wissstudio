# WissNails Studio

L'application de gestion du salon WissNails : rendez-vous, clientes, calendrier synchronisé, stock, finances, galerie, avis et rapports.
Next.js 15 · TypeScript · Tailwind · shadcn/ui · Supabase · PWA. Aucune IA : tous les calculs sont locaux et déterministes.

---

## 1. Démarrer en local (10 minutes)

**Prérequis :** Node.js 20+, Docker Desktop (pour Supabase en local), la CLI Supabase (`npm i -g supabase` ou `brew install supabase/tap/supabase`).

```bash
npm install
supabase start          # lance Postgres, Auth et Storage en local, applique les migrations ET le seed
cp .env.example .env.local
```

`supabase start` affiche `API URL`, `anon key` et `service_role key` : copiez-les dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=…
SUPABASE_SERVICE_ROLE_KEY=…
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev
```

Ouvrez http://localhost:3000 et connectez-vous avec le compte de démonstration :
**wiss@wissnails.fr / wissnails123** (12 clientes, 6 mois de rendez-vous, stock, dépenses, avis).

Pour repartir de zéro : `supabase db reset`.

## 2. Mettre en ligne (Supabase Cloud + Vercel)

1. **Supabase** : créez un projet sur supabase.com, puis :
   ```bash
   supabase link --project-ref VOTRE_REF
   supabase db push            # applique les 4 migrations (pas le seed)
   ```
   Dans *Authentication → URL Configuration* : *Site URL* = `https://votre-domaine`, et ajoutez `https://votre-domaine/auth/callback` aux *Redirect URLs*.
2. **Vercel** : importez le dépôt, ajoutez les variables de `.env.example` (avec `NEXT_PUBLIC_SITE_URL=https://votre-domaine`), déployez.
3. Ouvrez l'app, cliquez **Create your studio** : le compte est créé avec les 10 prestations et les 13 catégories de stock.
   *Settings → Data → Load demo data* remplit un compte vide avec les données de démo si vous voulez essayer.
4. Une fois votre compte créé, mettez `NEXT_PUBLIC_ALLOW_SIGNUP=false` sur Vercel pour fermer les inscriptions.

## 3. Google Calendar (synchronisation dans les deux sens)

1. Sur https://console.cloud.google.com : créez un projet, activez **Google Calendar API**.
2. *APIs & Services → OAuth consent screen* : type « External », ajoutez votre adresse comme utilisatrice de test (ou publiez l'app).
3. *Credentials → Create credentials → OAuth client ID → Web application*.
   *Authorized redirect URI* : `https://votre-domaine/api/integrations/google/callback` (et `http://localhost:3000/api/integrations/google/callback` pour le local).
4. Ajoutez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`, redéployez, puis *Settings → Integrations → Connect Google Calendar*.

Ce qui se passe ensuite :
- un rendez-vous créé, déplacé ou annulé dans le studio est créé, déplacé ou supprimé dans Google (couleur selon le statut) ;
- un rendez-vous déplacé ou supprimé dans Google est mis à jour dans le studio : instantanément quand l'app est en HTTPS (notifications push Google), sinon via le bouton **Sync Google** du calendrier ou la tâche planifiée ;
- option : importer aussi les événements créés directement dans Google (en « Pending »).

**Tâche planifiée** : `vercel.json` appelle `/api/cron/google-sync` une fois par jour (06:00 UTC) (filet de sécurité + renouvellement des notifications Google, qui expirent après ~7 jours + synchro Calendly). Définissez `CRON_SECRET`. Le plan gratuit Vercel n'autorise qu'un cron par jour ; sur Vercel Pro, passez à `*/15 * * * *`. Les notifications push suffisent au quotidien. Guide complet : [DEPLOYMENT.md](DEPLOYMENT.md).

## 4. Calendly

1. Dans Calendly : *Integrations → API & Webhooks → Personal access token*.
2. *Settings → Integrations* : collez le jeton et cliquez **Connect Calendly**. L'app importe les réservations existantes et crée elle-même le webhook signé (synchro instantanée : app en ligne en HTTPS + forfait Calendly payant).
3. **Nommez vos types d'événements Calendly comme vos prestations** (ex. « Pose gel complète ») pour que le prix et la durée correspondent.

La page **Booking** affiche votre page Calendly (`NEXT_PUBLIC_CALENDLY_URL`, par défaut `https://calendly.com/wissnails00/wissnails`). Une réservation faite depuis cette page est ajoutée au studio immédiatement.

Ce qui se passe :
- réservation sur Calendly → rendez-vous « Confirmed » dans le studio, cliente créée ou retrouvée par email ;
- annulation sur Calendly → rendez-vous annulé dans le studio ;
- annulation dans le studio d'un rendez-vous Calendly → annulé aussi sur Calendly ;
- sans webhook (forfait gratuit ou app en local), les réservations arrivent quand même : tâche planifiée et boutons **Sync now** / **Sync Calendly**.

Chaque réservation est identifiée par l'URI de l'événement Calendly : webhook, page Booking et synchro peuvent recevoir la même réservation sans créer de doublon.

**Limite de Calendly :** son API ne permet pas à une autre application de créer une réservation. Pour que les rendez-vous pris dans le studio bloquent les créneaux Calendly, connectez Calendly au **même Google Calendar** (*Calendly → Calendar sync → Check for conflicts*) : le studio écrit dans Google, Calendly y voit le créneau occupé. Les rendez-vous venus de Calendly ne sont jamais recopiés dans Google par le studio (Calendly le fait déjà), ce qui évite les doublons.

## 5. Avis Google (optionnel)

Activez **Places API (New)** dans Google Cloud, créez une clé API → `GOOGLE_PLACES_API_KEY`. Renseignez votre *Google Place ID* dans *Settings → Salon*.
Le bouton **Import from Google** de la page Reviews récupère les derniers avis (Google n'en fournit que 5 par appel ; les avis déjà importés ne sont pas dupliqués).

---

## Fonctionnalités

| Page | Contenu |
|---|---|
| Dashboard | Message d'accueil, CA jour/semaine/mois/année, bénéfice, dépenses, clientes du mois, panier moyen, % de clientes fidèles, objectif mensuel, graphiques CA et bénéfice sur 12 mois, rendez-vous du jour et à venir, top prestations, meilleure cliente, alertes stock, activité récente, actions rapides |
| Calendar | Jour / semaine / mois / agenda, glisser-déposer et redimensionner, clic sur un créneau pour réserver, horaires d'ouverture, couleurs : rose confirmé, jaune en attente, vert terminé, rouge annulé |
| Appointments | Onglets à venir / aujourd'hui / en attente / passés / annulés, recherche, export CSV. Fiche : terminer (paiement, stock, fidélité, facture), annuler, dupliquer, modifier, encaisser, produits utilisés, photos, marge |
| Formulaire de RDV | Cliente (ou création à la volée), prestation, French, nail art et nail art complexe au nombre d'ongles, strass, remise, carte cadeau, **total calculé en direct** |
| Clients | Filtres favorites / VIP / inactives / anniversaires du mois, tri, import et export CSV. Profil : contact en un geste, allergies, préférences, fidélité, historique chronologique, galerie, factures, prestation favorite, produits habituels |
| Finance | Semaine / mois / année, revenus, dépenses, bénéfice, impôts estimés, évolution, meilleur et pire mois, prestations les plus rentables, meilleures clientes, dépenses par catégorie, factures, cartes cadeaux |
| Stock | Photos, fournisseur, prix, emplacement, code-barres, seuil d'alerte en rouge, historique des mouvements, réassort enregistré en dépense |
| Services | Les 10 prestations préchargées, prix, durée, couleur, ordre, et **produits déduits automatiquement** par prestation et par option nail art |
| Gallery | Avant/après avec curseur de comparaison, catégories (Wedding, French, Luxury, Short, Long, Babyboomer, Halloween, Christmas, Summer, Spring), recherche |
| Reviews | Note moyenne, répartition, avis Google / en personne / Instagram |
| Reports | Journalier, hebdomadaire, mensuel, annuel en **PDF, Excel, CSV** |
| Settings | Salon, logo, horaires, réseaux, prix des options, taxes, objectif, fidélité, techniciennes, devise, format, thème, intégrations, sauvegarde JSON |
| Facture | Mise en page A4 ou ticket 80 mm, impression directe, mention « TVA non applicable, art. 293 B du CGI » |

**Partout :** recherche globale ⌘K, notifications (RDV dans les 3 h, stock bas, anniversaires, annulations, RDV terminés, paiements), mode sombre, application installable (PWA) avec pages hors connexion, responsive téléphone / tablette / ordinateur.

**Raccourcis clavier :** `⌘K` recherche · `N` nouveau RDV · `C` nouvelle cliente · `E` dépense · `S` stock · `G` puis `D/C/A/L/F` pour naviguer · `?` aide.

## Comment fonctionne « Terminer un rendez-vous »

La fonction SQL `complete_appointment` fait tout en une seule transaction :
1. déduit du stock chaque produit configuré pour la prestation, plus les options (ex. 1 strass × nombre de strass) ;
2. calcule le coût produit réel et donc la marge ;
3. marque le paiement, débite la carte cadeau si utilisée ;
4. ajoute les points de fidélité ;
5. crée la facture numérotée (`WN-2026-0001`…).

## Architecture

```
supabase/
  migrations/   schéma, sécurité (RLS + storage), fonctions métier, générateur de démo
  seed.sql      compte de démo local
src/
  app/                    routes (App Router)
    (auth)/               login, signup, forgot-password, reset-password
    (app)/                pages protégées : dashboard, calendar, appointments, clients, finance,
                          invoices, stock, services, gallery, reviews, reports, settings
    api/                  OAuth Google, webhooks Calendly et Google, cron
  components/ui/          composants shadcn/ui
  components/layout/      sidebar, barre du haut, navigation mobile, recherche, notifications
  components/shared/      cartes stat, compteurs animés, états vides, upload photo…
  features/<domaine>/     repository.ts (lecture) · actions.ts (Server Actions) · schemas.ts (Zod)
                          components/ (UI du domaine) · lib/ (logique pure : prix, analytics, exports)
  hooks/ stores/ lib/ types/
```

Règles du code : les pages serveur lisent via les *repositories*, toutes les écritures passent par des *Server Actions* validées par Zod et renvoient `{ ok, data | error }` ; le hook `useServerAction` gère chargement, toasts et rafraîchissement. Le prix d'un RDV est calculé par une seule fonction (`features/appointments/lib/pricing.ts`) côté formulaire et côté serveur. Chaque table est protégée par RLS (chaque compte ne voit que ses données) et les jetons OAuth ne sont lisibles que côté serveur.

`npm run db:types` génère les types Supabase si vous souhaitez typer le client.

## Langue

L'interface est en anglais ; factures, rapports PDF/Excel et données de démo sont en français. Le réglage *Date & number format* change le format des dates et des montants.
