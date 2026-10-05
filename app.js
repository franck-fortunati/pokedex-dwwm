import express from 'express';
import dotenv from 'dotenv';

dotenv.config()

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = 'https://pokeapi.co/api/v2';

app.set('view engine', 'ejs');
app.use(express.static('public'))

app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const response = await fetch(`${API_URL}/pokemon?limit=${limit}&offset=${offset}`);
        const data = await response.json();

        const pokemons = await Promise.all(
            data.results.map(async (pokemon) => {
                const resPokemon = await fetch(pokemon.url);
                const details = await resPokemon.json();

                return {
                    id: details.id,
                    name: details.name,
                    image: details.sprites.other['official-artwork'].front_default
                };
            })
        );

        // const pokemons = data.results.map((pokemon) => {
        //     const id = pokemon.url.split('/').filter(Boolean).pop();
        //     return {
        //         name: pokemon.name,
        //         id: id
        //     };
        // });

        res.render('layout', {
            title: 'Accueil',
            page: 'pages/index',
            pokemons: pokemons,
            currentPage: page
        })

    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur lors de la récupération des Pokémon')
    };
});

app.get('/pokemon/:name', async (req, res) => {
    try {
        const pokemonName = req.params.name.toLowerCase();

        const urlComplete = `${API_URL}/pokemon/${pokemonName}`;
        console.log("URL appelée :", urlComplete);
        console.log("Nom demandé :", pokemonName)

        const response = await fetch(`${API_URL}/pokemon/${pokemonName}`);
        if (!response.ok) throw new Error("Pokémon non trouvé");

        const pokemonData = await response.json();

        res.render('layout', {
            title: pokemonData.name.toUpperCase(),
            page: 'pages/pokemon',
            pokemon: pokemonData
        });
    } catch (err) {
        console.error(err);
        res.status(404).send("Pokémon introuvable !")
    };
});

app.get('/generation/:id', async (req, res) => {
    try {
        const genId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 20
        
        const response = await fetch(`${API_URL}/generation/${genId}`);
        if (!response.ok) throw new Error("Génération non trouvée");
        const genData = await response.json();

        const sortedSpecies = genData.pokemon_species.map((species) => {
            const parts = species.url.split('/').filter(Boolean);
            const id = parseInt(parts[parts.length - 1]);
            return {name: species.name, id}
        }).sort((a, b) => {
            return a.id - b.id
        });

        const totalPokemons = sortedSpecies.length;
        const totalPages = Math.ceil(totalPokemons / limit);
        const startIndex = (page - 1) * limit;
        const pageSpecies = sortedSpecies.slice(startIndex, startIndex + limit);

        const pokemonResults = await Promise.all(pageSpecies.map(async (pokemon) => {
            try {
                const resPokemon = await fetch(`${API_URL}/pokemon/${pokemon.name}`);
                if (!resPokemon.ok) return null;

                const details = await resPokemon.json();
                
                return {
                    id: details.id,
                    name: details.name,
                    image: details.sprites.other['official-artwork'].front_default
                };
            } catch (err) {
                return null;
            };
        }));

        const pokemons = pokemonResults.filter(p => p !== null);

        res.render('layout', {
            title: `Génération ${genId}`,
            page: 'pages/index',
            pokemons: pokemons,
            currentPage: page,
            totalPages: totalPages,
            genId: genId
        });
    } catch (err) {
        console.error(err);
        res.status(404).send("Génération introuvable !");
    };
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`)
});
