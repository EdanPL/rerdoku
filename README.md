# RERdoku

**[Jouer à RERdoku](https://edanpl.github.io/rerdoku/)**

RERdoku est un jeu de réflexion quotidien basé sur le réseau RER d'Île-de-France, largement inspiré par Métrodoku. Testez vos connaissances géographiques et ferroviaires en remplissant une grille de 9 cases avec les 249 gares du réseau francilien.

## Comment jouer ?

Chaque jour, une nouvelle grille vous met au défi de trouver 9 gares spécifiques. Pour valider une case, la gare proposée doit correspondre simultanément à la condition de sa ligne et à celle de sa colonne. 

*   **Une seule utilisation :** Chaque gare ne peut être placée qu'une seule fois par grille.
*   **Précision exigée :** Vous avez droit à un maximum de 3 erreurs par jour avant la fin de la partie.
*   **Unicité :** La grille du jour est exactement la même pour tous les joueurs.

## Fonctionnalités clés

*   **Génération procédurale (Seed) :** Les grilles sont générées dynamiquement côté client via un générateur de nombres pseudo-aléatoires (Mulberry32) prenant la date du jour comme graine (Seed).
*   **Système Anti-Doublon :** Un algorithme de vérification rétroactive parcourt l'historique complet des tirages en arrière-plan (du jour de lancement jusqu'au jour J) pour garantir qu'aucune grille n'est générée deux fois.
*   **Système d'Archives :** Possibilité de jouer aux grilles des jours précédents en sélectionnant une date passée.
*   **Moteur de règles flexible :** 28 conditions dynamiques (appartenance à une ligne A-E, géolocalisation, particularités typographiques, etc.) capables de générer des centaines de milliers de combinaisons valides.
*   **Recherche intelligente :** Barre de recherche avec autocomplétion pour trouver rapidement une gare et visualiser ses correspondances.

## Architecture Technique

RERdoku est conçu pour être léger, rapide et entièrement autonome.

*   **Front-end pur :** HTML5, CSS3, Vanilla JavaScript.
*   **Zéro Back-end :** Aucune base de données, aucune API externe, aucun serveur Node.js/PHP. 
*   **Base de données locale :** Les informations géographiques et structurelles des gares sont stockées dans un fichier `gares_rer_pures.json` léger et interrogé via l'API Fetch.
*   **Hébergement :** Déployé via GitHub Pages.

## Installation en local

Si vous souhaitez explorer le code ou modifier le jeu en local :

1. Clonez ce dépôt :
   `git clone https://github.com/EdanPL/rerdoku.git`
2. Ouvrez le dossier du projet.
3. Lancez le fichier `index.html` via un serveur local (utilisez par exemple l'extension Live Server sur VS Code pour éviter les erreurs CORS liées au chargement du fichier JSON).

## Licence et Crédits

*   **Inspiration :** Le concept original est inspiré du jeu Métrodoku.
*   **Données :** Basé sur les données ouvertes du réseau de transport en commun d'Île-de-France (RER).
*   Projet développé à des fins ludiques et d'apprentissage.
