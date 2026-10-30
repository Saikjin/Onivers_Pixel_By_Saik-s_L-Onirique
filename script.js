// Base de données initiale des jeux
let games = JSON.parse(localStorage.getItem('saiks_onirique_games')) || [
    {
        title: "Exemple : FFXIV / MMO Favori",
        category: "MMO RPG",
        description: "Un univers riche où l'aventure onirique prend tout son sens."
    },
    {
        title: "Exemple : Terraria Pixel",
        category: "Sandbox / Coop",
        description: "Création et survie au cœur des pixels."
    }
];

// Gestion des onglets / modes
const btnJeux = document.getElementById('btn-mode-jeux');
const btnAdmin = document.getElementById('btn-mode-admin');
const sectionJeux = document.getElementById('section-jeux');
const sectionAdmin = document.getElementById('section-admin');

btnJeux.addEventListener('click', () => {
    btnJeux.classList.add('active');
    btnAdmin.classList.remove('active');
    sectionJeux.classList.add('active');
    sectionAdmin.classList.remove('active');
});

btnAdmin.addEventListener('click', () => {
    btnAdmin.classList.add('active');
    btnJeux.classList.remove('active');
    sectionAdmin.classList.add('active');
    sectionJeux.classList.remove('active');
});

// Affichage des jeux
const gamesGrid = document.getElementById('gamesGrid');
const searchInput = document.getElementById('searchInput');

function renderGames(filterText = '') {
    gamesGrid.innerHTML = '';
    
    const filtered = games.filter(g => 
        g.title.toLowerCase().includes(filterText.toLowerCase()) || 
        g.category.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filtered.length === 0) {
        gamesGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #8892b0;">Aucun jeu trouvé dans cet ønivers...</p>`;
        return;
    }

    filtered.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div class="game-info">
                <span class="game-category">${game.category}</span>
                <h3>${game.title}</h3>
                <p>${game.description}</p>
            </div>
        `;
        gamesGrid.appendChild(card);
    });
}

// Recherche dynamique
searchInput.addEventListener('input', (e) => {
    renderGames(e.target.value);
});

// Ajout d'un jeu (Admin)
const gameForm = document.getElementById('gameForm');
gameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newGame = {
        title: document.getElementById('gameTitle').value,
        category: document.getElementById('gameCategory').value,
        description: document.getElementById('gameDescription').value
    };

    games.push(newGame);
    localStorage.setItem('saiks_onirique_games', JSON.stringify(games));
    
    gameForm.reset();
    renderGames();
    
    // Basculer automatiquement vers l'espace jeux pour voir le résultat
    btnJeux.click();
});

// Premier chargement
renderGames();
