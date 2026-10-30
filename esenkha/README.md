# Esenkha

Site personnel listant les jeux en ligne sur lesquels je joue (MMO, coop…) **ou mes projets web**, avec une interface d'administration pour tout gérer. Le mode d'affichage se bascule depuis les options du site.

---

## Stack

HTML · CSS · JavaScript · PHP · JSON — aucune dépendance externe, aucun framework.

---

## Prérequis

- **PHP 8.5 ou supérieur** (Apache ou Nginx + PHP-FPM)
- Extension PHP `curl` — uniquement pour la connexion Vestikan (optionnelle)

Sur une version de PHP plus ancienne, le site affiche un message explicite
(contrôle effectué par `requirements.php`) au lieu de planter.

---

## Structure des fichiers

```
index.php           Interface publique
admin.php           Interface d'administration (protégée par mot de passe)
save.php            Endpoint PHP — écriture des fichiers JSON
images.php          Endpoint PHP — gestion des images (liste, upload, suppression)
requirements.php    Contrôle de la version de PHP (8.5+), inclus par tous les points d'entrée
app.js              Logique de l'interface publique
admin.js            Logique de l'interface d'administration
style.css           Styles de l'interface publique
admin.css           Styles de l'interface d'administration
config.json         Configuration du site (titre, sous-titre, mode, version…)
games.json          Données des jeux
projects.json       Données des projets web
tags.json           Tags personnalisés (type, statut, autres) — par mode
img/                Illustrations des jeux
img/projects/       Illustrations des projets (créé automatiquement)
```

---

## Installation

1. Déposer tous les fichiers sur un hébergement **PHP 8.5+** (Apache ou Nginx + PHP-FPM).
2. S'assurer que les fichiers JSON et le dossier `img/` sont accessibles en écriture par le serveur web :

```bash
chmod 664 config.json games.json projects.json tags.json pass.json
chmod 775 img/
chown www-data:www-data config.json games.json projects.json tags.json img/
```

Le sous-dossier `img/projects/` est créé automatiquement lors du premier upload en mode projets.

3. **Renommer les fichiers `*-sample.json` en enlevant le suffixe `-sample`**,
   c'est-à-dire :

```
config-sample.json    → config.json
games-sample.json     → games.json
projects-sample.json  → projects.json
tags-sample.json      → tags.json
pass-sample.json      → pass.json
```

   Ce sont ces fichiers (sans `-sample`) que lisent et écrivent `index.php`,
   `admin.php`, `save.php` et `save_password.php`. Les versions `-sample`
   servent uniquement d'exemple/point de départ et ne sont pas utilisées
   telles quelles par le site.

4. Accéder à `admin.php` et **changer le mot de passe** (par défaut : `mdp123`).

---

## Connexion Vestikan (SSO, optionnel)

Esenkha peut être protégé via **Vestikan**, en plus (ou à la place) du mot de
passe. C'est une intégration **Pattern A** : Esenkha n'a pas de comptes locaux,
donc une identité Vestikan validée suffit à ouvrir l'accès admin — ce qui est
sûr car Vestikan est **mono-utilisateur** (le seul `vestikan_id` possible est
le vôtre).

Les deux voies (mot de passe ou Vestikan) posent le même flag de session
`$_SESSION['logged_in']`, donc `save.php`, `images.php` et `save_password.php`
restent inchangés.

**Fichiers ajoutés :**

```
vestikan-sdk.php        SDK Vestikan (ne pas modifier — seul ajustement local : retrait de
                        curl_close(), déprécié en PHP 8.5)
vestikan-config.php     Secrets (client_id / client_secret / redirect_uri) — NON versionné
vestikan-login.php      Démarre le flux → begin()
vestikan-callback.php   redirect_uri → complete(), pose $_SESSION['logged_in']
```

**Mise en place :**

1. Enregistrer Esenkha dans l'admin Vestikan
   (`https://concepts.esenjin.xyz/vestikan/admin` → « Sites satellites »).
   Le **redirect_uri** doit pointer, au caractère près, vers
   `…/vestikan-callback.php` en HTTPS.
2. Reporter `client_id`, `client_secret` et `redirect_uri` dans
   `vestikan-config.php`.
3. Vérifier que `vestikan-config.php` n'est **ni versionné** (`.gitignore`) **ni
   servi** en HTTP (bloc `.htaccess` déjà prévu).

Le bouton « Se connecter avec Vestikan » n'apparaît sur l'écran de login que si
`vestikan-config.php` et `vestikan-login.php` sont présents. Sans ces fichiers,
Esenkha se comporte exactement comme avant (mot de passe seul).

---

## Fonctionnalités

### Interface publique
- Grille de cartes avec illustration, nom et tags
- Onglets dynamiques basés sur les tags de type « statut »
- Survol d'une carte : aperçu rapide du contenu
- Clic sur une carte : modale avec tous les détails
- Modale « sources » : liens SauceNAO pour chaque illustration

![esenkha1](https://concepts.esenjin.xyz/cyla/fichiers/6a32989ea3c0f_1781700766.png)
![esenkha1](https://concepts.esenjin.xyz/cyla/fichiers/6a3298b102395_1781700785.png)

- Panneau de filtres latéral (hors tags de statut) : filtres désactivés par
  défaut, se combinent en **ET** — cocher plusieurs tags n'affiche que les
  entrées qui possèdent tous les tags cochés.

### Administration
- **Deux modes** : Jeux ou Projets web, basculable depuis les Options
- Ajout, modification, suppression d'entrées
- Réorganisation par glisser-déposer
- Gestion des tags (type, statut, autres) séparés par mode, avec couleur personnalisable
  - La catégorie `status` alimente les **onglets du menu du haut** sur le site public ;
    toutes les autres catégories alimentent le **panneau de filtres latéral**. Cet
    emplacement est rappelé par un badge (« ↑ Menu haut » / « ☰ Filtres latéraux »)
    à côté de chaque catégorie dans la fenêtre de gestion des tags.
- Bibliothèque d'images : upload par glisser-déposer, sélection, suppression
  - Images jeux dans `img/`, images projets dans `img/projects/`
  - Les images déjà utilisées par une entrée sont protégées : leur bouton de
    suppression est masqué pour éviter de casser une référence. Les images
    non utilisées sont mises en évidence par un badge « Non utilisé ».
- Options du site : titre, sous-titre, mode, bouton personnalisé
- Interface responsive (hamburger sur mobile)

![esenkha2](https://concepts.esenjin.xyz/cyla/fichiers/6a3266a6c6e75_1781687974.png)
![esenkha3](https://concepts.esenjin.xyz/cyla/fichiers/6a3266b1a9588_1781687985.png)
![esenkha4](https://concepts.esenjin.xyz/cyla/fichiers/6a3266bc6e378_1781687996.png)
![esenkha5](https://concepts.esenjin.xyz/cyla/fichiers/6a3266c74a7db_1781688007.png)

### Données d'une entrée Jeu
| Champ | Description |
|---|---|
| `name` | Nom du jeu |
| `tag_type` | Tag de type (ex : MMO, Coop) |
| `tag_status` | Tag de statut (ex : Actuel, Ancien) |
| `tag_others` | Tags supplémentaires |
| `image` | URL ou chemin local (`img/…`) |
| `server` | Serveur actuel |
| `old_servers` | Anciens serveurs |
| `main_character` | Personnage principal |
| `alt_characters` | Personnages secondaires |
| `uid` | Identifiant de compte |
| `guild` | Guilde actuelle |
| `old_guilds` | Anciennes guildes |
| `sort_order` | Ordre d'affichage |

### Données d'une entrée Projet
| Champ | Description |
|---|---|
| `name` | Nom du projet |
| `tag_type` | Tag de type (ex : Vitrine, Outil) |
| `tag_status` | Tag de statut (ex : En cours, Terminé) |
| `tag_others` | Tags supplémentaires |
| `image` | URL ou chemin local (`img/projects/…`) |
| `description` | Courte description |
| `url_project` | Lien vers le projet en ligne |
| `url_repo` | Lien vers le dépôt de code |
| `sort_order` | Ordre d'affichage |

### Structure d'un tag (`tags.json`)
```json
{
  "id":       "current",
  "label":    "Actuel",
  "category": "status",
  "color":    "#5cba8a",
  "mode":     "games"
}
```
Le champ `mode` vaut `"games"` ou `"projects"`. S'il est absent, `"games"` est utilisé par défaut (rétro-compatibilité).
