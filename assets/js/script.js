// --- 1. Variables globales ---
let garesData = []; 
let caseActive = null; 
let garesTrouvees = []; // NOUVEAU : Mémoire des gares déjà placées dans la grille
// NOUVELLES VARIABLES DE JEU
let score = 0;
let erreurs = 0;
let casesValidees = 0; // Pour savoir quand on atteint 9 (Victoire)
let partieTerminee = false;
const MAX_ERREURS = 3;

// --- LE MOTEUR DE RÈGLES ---
// Ce dictionnaire contient les fonctions qui vont vérifier si une gare est valide
// Fonction pour retirer les accents lors des vérifications de lettres
const enleverAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// --- LE MOTEUR DE RÈGLES ---
const reglesDuJeu = {
    // 1. LES LIGNES
    "Sur le RER A": (gare) => gare.lignes.includes("RER A"),
    "Sur le RER B": (gare) => gare.lignes.includes("RER B"),
    "Sur le RER C": (gare) => gare.lignes.includes("RER C"),
    "Sur le RER D": (gare) => gare.lignes.includes("RER D"),
    "Sur le RER E": (gare) => gare.lignes.includes("RER E"),
    "Correspondance (Plusieurs RER)": (gare) => gare.lignes.length > 1,
    "Aucune correspondance RER": (gare) => gare.lignes.length === 1,

    // 2. LES NOMS (LETTRES ET MOTS)
    "Commence par 'C'": (gare) => enleverAccents(gare.nom).toUpperCase().startsWith("C"),
    "Commence par 'M'": (gare) => enleverAccents(gare.nom).toUpperCase().startsWith("M"),
    "Commence par 'S'": (gare) => enleverAccents(gare.nom).toUpperCase().startsWith("S"),
    "Commence par 'P'": (gare) => enleverAccents(gare.nom).toUpperCase().startsWith("P"),
    "Commence par 'V'": (gare) => enleverAccents(gare.nom).toUpperCase().startsWith("V"),
    "Commence par une voyelle": (gare) => /^[AEIOUY]/i.test(enleverAccents(gare.nom)),
    "Termine par 's'": (gare) => gare.nom.toLowerCase().endsWith("s"),
    "Termine par 'e'": (gare) => gare.nom.toLowerCase().endsWith("e"),
    "Contient la lettre 'Y'": (gare) => enleverAccents(gare.nom).toUpperCase().includes("Y"),
    "Contient la lettre 'Z'": (gare) => enleverAccents(gare.nom).toUpperCase().includes("Z"),
    "Contient 'Saint'": (gare) => gare.nom.includes("Saint"),
    "Contient 'sur'": (gare) => gare.nom.toLowerCase().includes("-sur-") || gare.nom.toLowerCase().includes(" sur "),
    "Contient 'Ville'": (gare) => gare.nom.toLowerCase().includes("ville") || gare.nom.toLowerCase().includes("villiers"),
    "Contient un tiret": (gare) => gare.nom.includes("-"),
    "Un seul mot (sans espace ni tiret)": (gare) => !gare.nom.includes("-") && !gare.nom.includes(" "),
    "Nom long (plus de 15 lettres)": (gare) => gare.nom.length > 15,
    "Nom court (moins de 8 lettres)": (gare) => gare.nom.length < 8,

    // 3. LA GÉOGRAPHIE (Utilisation des coordonnées GPS de la base de données)
    // Limites approximatives de Paris intra-muros : Lat entre 48.815 et 48.902 / Lon entre 2.225 et 2.469
    "Dans Paris intra-muros": (gare) => 
        gare.coord.lat > 48.815 && gare.coord.lat < 48.902 && 
        gare.coord.lon > 2.225 && gare.coord.lon < 2.469,
        
    "En dehors de Paris": (gare) => 
        !(gare.coord.lat > 48.815 && gare.coord.lat < 48.902 && 
          gare.coord.lon > 2.225 && gare.coord.lon < 2.469),
          
    "Au Nord de Paris": (gare) => gare.coord.lat > 48.902,
    "Au Sud de Paris": (gare) => gare.coord.lat < 48.815,
    "À l'Est de Paris": (gare) => gare.coord.lon > 2.469,
    "À l'Ouest de Paris": (gare) => gare.coord.lon < 2.225
};

// --- MOTEUR ALÉATOIRE (PRNG) ---
// Formule mathématique qui donne un hasard prévisible selon une graine
function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Date de lancement officiel du jeu (Fixée ici au 1er septembre 2026)
const DATE_LANCEMENT = new Date("2026-09-01T00:00:00").getTime();
const JOUR_EN_MS = 1000 * 60 * 60 * 24;

// --- FONCTION DE GÉNÉRATION DE LA GRILLE ---
function genererGrilleDuJour() {
    const conteneurGrille = document.getElementById('grille-jeu');
    const toutesLesConditions = Object.keys(reglesDuJeu);
    // NOUVEAU : On regarde si l'URL contient "?date=YYYY-MM-DD"
    const parametresUrl = new URLSearchParams(window.location.search);
    const dateArchive = parametresUrl.get('date');
    
    // Si une date d'archive est demandée, on l'utilise, sinon on prend la date du jour
    const dateAujourdhui = dateArchive ? new Date(dateArchive + "T00:00:00") : new Date();
    // 1. Calcul du numéro du jour (Jours écoulés depuis le lancement)
    const numeroJour = Math.floor((dateAujourdhui.getTime() - DATE_LANCEMENT) / JOUR_EN_MS);

    // Sous-fonction pour tester une grille avec une graine précise
    function genererGrille(graine) {
        let prng = mulberry32(graine);
        let grilleValide = false;
        let colonnes = [];
        let lignes = [];

        while (!grilleValide) {
            // Mélange avec notre PRNG (au lieu de Math.random)
            let conditionsMelangees = [...toutesLesConditions];
            for (let i = conditionsMelangees.length - 1; i > 0; i--) {
                const j = Math.floor(prng() * (i + 1));
                [conditionsMelangees[i], conditionsMelangees[j]] = [conditionsMelangees[j], conditionsMelangees[i]];
            }
            
            colonnes = conditionsMelangees.slice(0, 3);
            lignes = conditionsMelangees.slice(3, 6);

            grilleValide = true;
            // Test de viabilité des 9 intersections
            for (let l = 0; l < 3; l++) {
                for (let c = 0; c < 3; c++) {
                    const reponses = garesData.filter(gare => 
                        reglesDuJeu[lignes[l]](gare) && reglesDuJeu[colonnes[c]](gare)
                    );
                    if (reponses.length === 0) {
                        grilleValide = false;
                        break;
                    }
                }
                if (!grilleValide) break;
            }
        }
        return { colonnes, lignes };
    }

    // 2. Le voyage dans le temps (Garantie Anti-Doublon)
    const historique = new Set();
    let grilleFinale = null;

    // On calcule à la vitesse de l'éclair toutes les grilles depuis le lancement
    for (let jour = 0; jour <= numeroJour; jour++) {
        let tentative = 0;
        let grilleTrouvee = null;
        let signature = "";
        
        do {
            // La graine combine le jour et le numéro de la tentative
            const graine = (jour * 10000) + tentative;
            grilleTrouvee = genererGrille(graine);
            
            // Création d'une empreinte (ex: "RER A|Commence par C||RER B|Contient Saint")
            const signatureColonnes = [...grilleTrouvee.colonnes].sort().join("|");
            const signatureLignes = [...grilleTrouvee.lignes].sort().join("|");
            signature = signatureColonnes + "||" + signatureLignes;
            
            tentative++;
        } while (historique.has(signature)); // Rejette la grille si elle est déjà sortie !
        
        historique.add(signature);
        
        // C'est la grille du jour actuel !
        if (jour === numeroJour) {
            grilleFinale = grilleTrouvee;
        }
    }

    // 3. Construction du HTML
    let htmlGrille = `<div class="cellule vide"></div>`;
    
    grilleFinale.colonnes.forEach(col => {
        htmlGrille += `<div class="cellule condition">${col}</div>`;
    });

    grilleFinale.lignes.forEach(ligne => {
        htmlGrille += `<div class="cellule condition">${ligne}</div>`;
        grilleFinale.colonnes.forEach(col => {
            htmlGrille += `<div class="cellule jeu" data-row="${ligne}" data-col="${col}"></div>`;
        });
    });

    conteneurGrille.innerHTML = htmlGrille;

    // 4. Mise à jour de la date d'aujourd'hui dans le HTML
    const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };
    document.getElementById('date-jour').textContent = dateAujourdhui.toLocaleDateString('fr-FR', optionsDate);
}

// --- 2. Sélection des éléments HTML ---
const modal = document.getElementById('modal-recherche');
const inputGare = document.getElementById('input-gare');
const listeResultats = document.getElementById('liste-resultats');
const cellulesJeu = document.querySelectorAll('.jeu');
// NOUVEAUX ÉLÉMENTS : Fenêtre de fin
const modalFin = document.getElementById('modal-fin-partie');
const titreFin = document.getElementById('titre-fin');
const scoreFin = document.getElementById('score-fin');
const garesTrouveesFin = document.getElementById('gares-trouvees-fin');
const btnRecommencer = document.getElementById('btn-recommencer');
const btnVoirSolutionsFin = document.getElementById('btn-voir-solutions-fin');
const btnFermerFin = document.getElementById('btn-fermer-fin');

// NOUVEAUX ÉLÉMENTS HTML
const affichageScore = document.getElementById('affichage-score');

// --- 3. Chargement de notre base de données ---
fetch('assets/data/gares_rer_pures.json') // (ou le bon chemin de ton fichier)
    .then(response => response.json())
    .then(data => {
        garesData = data;
        genererGrilleDuJour(); // 1. On génère la grille
        activerClicsCases();   // 2. On active les clics sur les nouvelles cases
    })
    .catch(error => console.error("Erreur de chargement :", error));

// --- 4. Gestion de la Modale (Ouverture / Fermeture) ---
function activerClicsCases() {
    // On doit re-sélectionner les cellules car elles viennent d'être générées
    const cellulesJeu = document.querySelectorAll('.jeu'); 

    cellulesJeu.forEach(cellule => {
        cellule.addEventListener('click', (evenement) => {
            caseActive = evenement.currentTarget; 
            
            const conditionLigne = caseActive.getAttribute('data-row');
            const conditionColonne = caseActive.getAttribute('data-col');

            const toutesReponsesPossibles = garesData.filter(gare => {
                return reglesDuJeu[conditionLigne](gare) && reglesDuJeu[conditionColonne](gare);
            });

            // COMPORTEMENT 1 : Partie terminée (Affichage solutions)
            if (partieTerminee) {
                titreSolutions.textContent = `${conditionLigne} / ${conditionColonne}`;
                compteurSolutions.textContent = `${toutesReponsesPossibles.length} réponses possibles`;
                listeGabaritSolutions.innerHTML = '';

                toutesReponsesPossibles.forEach(gare => {
                    const li = document.createElement('li');
                    li.className = 'resultat-item';
                    if (caseActive.textContent.includes(gare.nom)) li.style.color = "#438ECA";
                    li.textContent = gare.nom;
                    listeGabaritSolutions.appendChild(li);
                });

                modalSolutions.style.display = 'flex'; 
                return; 
            }

            // COMPORTEMENT 2 : Partie en cours
            if (caseActive.querySelector('.gare-trouvee')) return;

            const reponsesPossiblesDispos = toutesReponsesPossibles.filter(gare => !garesTrouvees.includes(gare.nom));
            
            const nombreDeReponses = reponsesPossiblesDispos.length;
            inputGare.placeholder = nombreDeReponses === 1 ? `1 réponse possible` : `${nombreDeReponses} réponses possibles`;

            modal.style.display = 'flex'; 
            inputGare.value = ''; 
            afficherResultats([]); 
            inputGare.focus(); 
        });
    });
}
// Fermer la modale de recherche classique en cliquant à l'extérieur
modal.addEventListener('click', (evenement) => {
    if (evenement.target === modal) {
        modal.style.display = 'none';
    }
});

// --- Fonction utilitaire pour nettoyer le texte (accents et tirets) ---
function normaliserTexte(texte) {
    return texte
        .toLowerCase() // Passe tout en minuscules
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Sépare les lettres de leurs accents et supprime les accents
        .replace(/-/g, " "); // Remplace tous les tirets par des espaces
}

// --- 5. La barre de recherche ---
inputGare.addEventListener('input', (evenement) => {
    // On applique notre nettoyage sur la saisie du joueur
    const motCle = normaliserTexte(evenement.target.value); 
    
    // Si le champ est vide (ou ne contient que des espaces invisibles)
    if (motCle.trim().length === 0) {
        afficherResultats([]);
        return; 
    }
    
    // On filtre les résultats
    const resultatsFiltres = garesData.filter(gare => {
        // On applique le même nettoyage sur le nom de la gare issue du JSON
        const nomGareNettoye = normaliserTexte(gare.nom);
        
        // On compare les deux versions nettoyées
        return nomGareNettoye.includes(motCle) && !garesTrouvees.includes(gare.nom);
    });
    
    afficherResultats(resultatsFiltres); 
});

// --- 6. Affichage des résultats ---
function afficherResultats(resultats) {
    listeResultats.innerHTML = ''; 
    const resultatsLimites = resultats.slice(0, 50);

    resultatsLimites.forEach(gare => {
        const li = document.createElement('li');
        li.className = 'resultat-item';
        li.textContent = gare.nom;

        li.addEventListener('click', () => {
            if (caseActive) {
                const conditionLigne = caseActive.getAttribute('data-row');
                const conditionColonne = caseActive.getAttribute('data-col');

                const ligneValide = reglesDuJeu[conditionLigne](gare);
                const colonneValide = reglesDuJeu[conditionColonne](gare);

                if (ligneValide && colonneValide) {
                    // --- GESTION DE LA BONNE RÉPONSE ---
                    garesTrouvees.push(gare.nom);
                    
                    // Mise à jour du score et de la victoire
                    score += 100;
                    casesValidees += 1;
                    affichageScore.textContent = `Score : ${score}/900`;

                    const pastillesHTML = gare.lignes.map(ligne => {
                        const lettre = ligne.replace('RER ', ''); 
                        return `<span class="pastille rer-${lettre.toLowerCase()}">${lettre}</span>`;
                    }).join('');

                    caseActive.innerHTML = `
                        <div class="gare-trouvee">
                            <div class="nom-gare">${gare.nom}</div>
                            <div class="lignes-gare">
                                ${pastillesHTML}
                            </div>
                        </div>
                    `;
                    
                    caseActive.style.backgroundColor = "white"; 
                    caseActive.style.pointerEvents = "none"; 

                    // Vérification de la victoire (dans l'étape 6, si la case est juste)
                    if (casesValidees === 9) {
                        setTimeout(() => {
                            partieTerminee = true; 
                            
                            // On modifie le titre pour la victoire
                            titreFin.textContent = "Félicitations !";
                            titreFin.style.color = "#007D4C"; // Un texte vert pour marquer le coup
                            
                            // On remplit les données
                            scoreFin.textContent = `${score}/900`;
                            garesTrouveesFin.textContent = `${casesValidees}/9`;
                            
                            // On affiche la fenêtre
                            modalFin.style.display = 'flex';
                            
                            // On masque les boutons d'abandon/solution car ils sont inutiles en cas de victoire totale
                            btnAbandon.style.display = "none";
                            btnVoirSolutionsFin.style.display = "none";
                            
                            // On centre le bouton Recommencer
                            btnRecommencer.parentElement.style.justifyContent = "center";
                        }, 500); 
                    }

                } else {
                    // --- GESTION DE L'ERREUR ---
                    erreurs += 1;
                    
                    // On remplit le cercle d'erreur correspondant (err-1, err-2, err-3)
                    document.getElementById(`err-${erreurs}`).classList.add('plein');

                    // Animation rouge sur la case
                    caseActive.style.backgroundColor = "#fed7d7"; 
                    setTimeout(() => {
                        caseActive.style.backgroundColor = "white"; 
                    }, 1000);

                    // Vérification de la défaite (Dans l'étape 6)
                    if (erreurs >= MAX_ERREURS) {
                        setTimeout(() => {
                            partieTerminee = true; // On bloque le jeu principal
                            
                            // On remplit les données de la fenêtre de fin
                            scoreFin.textContent = `${score}/900`;
                            garesTrouveesFin.textContent = `${casesValidees}/9`;
                            
                            // On affiche la fenêtre
                            modalFin.style.display = 'flex';
                            
                            // On empêche de cliquer sur le bouton "Abandonner" d'origine puisqu'on a déjà perdu
                            btnAbandon.style.pointerEvents = "none";
                            btnAbandon.style.opacity = "0.5";
                        }, 500); // Petit délai pour laisser l'animation rouge se finir
                    }
                }
            }
            modal.style.display = 'none'; 
        });

        listeResultats.appendChild(li);
    });
}

// --- 7. Bouton Abandonner et solutions ---
const btnAbandon = document.getElementById('btn-abandon');
const modalSolutions = document.getElementById('modal-solutions');
const btnFermerSolutions = document.getElementById('btn-fermer-solutions');
const titreSolutions = document.getElementById('titre-solutions');
const compteurSolutions = document.getElementById('compteur-solutions');
const listeGabaritSolutions = document.getElementById('liste-gabarit-solutions');

btnAbandon.addEventListener('click', () => {
    if (!confirm("Es-tu sûr de vouloir abandonner ?")) return;

    partieTerminee = true; // On indique que le jeu est fini

    // On remplit les cases vides (comme avant)
    cellulesJeu.forEach(cellule => {
        if (!cellule.querySelector('.gare-trouvee')) {
            const conditionLigne = cellule.getAttribute('data-row');
            const conditionColonne = cellule.getAttribute('data-col');

            const solution = garesData.find(gare => {
                if (garesTrouvees.includes(gare.nom)) return false; 
                return reglesDuJeu[conditionLigne](gare) && reglesDuJeu[conditionColonne](gare);
            });

            if (solution) {
                garesTrouvees.push(solution.nom);
                const pastillesHTML = solution.lignes.map(ligne => {
                    const lettre = ligne.replace('RER ', ''); 
                    return `<span class="pastille rer-${lettre.toLowerCase()}">${lettre}</span>`;
                }).join('');

                cellule.innerHTML = `
                    <div class="gare-trouvee" style="opacity: 0.6;">
                        <div class="nom-gare">${solution.nom}</div>
                        <div class="lignes-gare">${pastillesHTML}</div>
                    </div>
                `;
                cellule.style.backgroundColor = "#e2e8f0"; 
            }
        }
        
        // ATTENTION : On retire le pointerEvents="none" pour autoriser le clic après abandon
        cellule.style.pointerEvents = "auto"; 
    });

    btnAbandon.textContent = "Partie terminée";
    btnAbandon.style.pointerEvents = "none";
    btnAbandon.style.opacity = "0.5";
});

// Fermer la modale des solutions
btnFermerSolutions.addEventListener('click', () => {
    modalSolutions.style.display = 'none';
});
modalSolutions.addEventListener('click', (evenement) => {
    if (evenement.target === modalSolutions) {
        modalSolutions.style.display = 'none';
    }
});

// --- 8. Gestion de la fenêtre de fin ---

// Bouton Recommencer : recharge simplement la page
btnRecommencer.addEventListener('click', () => {
    location.reload(); 
});

// Bouton Voir les solutions : ferme la fenêtre de fin et exécute l'algorithme d'abandon
btnVoirSolutionsFin.addEventListener('click', () => {
    modalFin.style.display = 'none'; // On cache la fenêtre de fin
    
    // On réutilise la logique du bouton Abandonner pour remplir la grille
    cellulesJeu.forEach(cellule => {
        if (!cellule.querySelector('.gare-trouvee')) {
            const conditionLigne = cellule.getAttribute('data-row');
            const conditionColonne = cellule.getAttribute('data-col');

            const solution = garesData.find(gare => {
                if (garesTrouvees.includes(gare.nom)) return false; 
                return reglesDuJeu[conditionLigne](gare) && reglesDuJeu[conditionColonne](gare);
            });

            if (solution) {
                garesTrouvees.push(solution.nom);
                const pastillesHTML = solution.lignes.map(ligne => {
                    const lettre = ligne.replace('RER ', ''); 
                    return `<span class="pastille rer-${lettre.toLowerCase()}">${lettre}</span>`;
                }).join('');

                cellule.innerHTML = `
                    <div class="gare-trouvee" style="opacity: 0.6;">
                        <div class="nom-gare">${solution.nom}</div>
                        <div class="lignes-gare">${pastillesHTML}</div>
                    </div>
                `;
                cellule.style.backgroundColor = "#e2e8f0"; 
            }
        }
        cellule.style.pointerEvents = "auto"; // Autorise le clic pour voir toutes les réponses possibles
    });
});

// Fermer la modale en cliquant sur la croix
btnFermerFin.addEventListener('click', () => {
    modalFin.style.display = 'none';
});

// Fermer la modale en cliquant à l'extérieur de la boîte blanche
modalFin.addEventListener('click', (evenement) => {
    if (evenement.target === modalFin) {
        modalFin.style.display = 'none';
    }
});