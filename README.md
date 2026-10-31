# Zelda Manager

Version web des trois classeurs Excel « Manager » (2015) de Soaresden, réunis dans un seul site :

| Jeu | Classeur d'origine | Contenu |
| --- | --- | --- |
| Ocarina of Time | `Zelda Ocarina Manager v7.xlsx` | améliorations, magie, flèches & sorts, quête de Biggoron, 100 Skulltulas (Normal / Master Quest par donjon + récompenses), 36 quarts de cœur, bouteilles, chants & masques |
| Majora's Mask | `Zelda Majora Manager v4 Trial.xlsx` | 24 masques, 60 fées, 60 Skulltulas, améliorations & flèches, 52 quarts de cœur (+ moment où ils sont accessibles), quiz de Keaton (30), bouteilles, chants, quête Anju & Kafei |
| Tri Force Heroes | `Zelda Tri-Force Heroes Manager v6 Trial.xlsx` | 136 défis (8 mondes + Crypte) avec leurs récompenses, 38 tenues (fabricables ou non), 70 matériaux (stock, besoins, où farmer, vendable ou non) |

Les versions « Trial » contenaient déjà toutes les données dans leurs onglets cachés (`GameBDD`, `QST-LVL`) : le site les utilise en entier, sans limitation ni mot de passe.

## Utiliser le site

- **Le plus simple :** double-clic sur `index.html` (aucune installation, fonctionne hors ligne).
- **Ou avec un petit serveur :** `python -m http.server 8765` dans ce dossier puis <http://localhost:8765>.
- La progression est sauvegardée automatiquement dans le navigateur. Menu **⋯** → exporter / importer un fichier `.json` pour la sauvegarder ou la passer sur un autre appareil.
- Bouton **FR / EN** en haut à droite.
- Bouton **♪ Musique** en bas à droite : les musiques des anciens sites (Gerudo Valley, Song of Healing, Hytopia) via les vidéos YouTube de leurs auteurs.

## Mettre en ligne

Le dossier est un site 100 % statique : il suffit de publier le contenu de `zelda-manager/` sur GitHub Pages, Netlify, Cloudflare Pages, etc.

## Régénérer les données depuis les Excel

```
pip install openpyxl
python tools/extract_data.py
```

Le script lit les classeurs du dossier parent et réécrit `data/oot.js`, `data/mm.js`, `data/tfh.js`.
Les traductions/corrections ajoutées pour le web (noms anglais officiels des chants et masques de Majora, horaires des quarts de cœur…) sont dans le script.

## Structure

```
index.html        page unique (routage par #/oot, #/mm, #/tfh)
css/style.css     thème (vert OoT, violet Majora, bleu TFH, comme les anciens sites ; clair/sombre)
js/app.js         application (sans dépendance)
data/*.js         données générées depuis les Excel
img/              toutes les images reprises des classeurs (masques, objets, carte des Esprits…)
tools/            script d'extraction
```

The Legend of Zelda est une marque de Nintendo — projet de fan non officiel.
