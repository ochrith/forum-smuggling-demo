const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== Stockage en mémoire ===== */
const users = [];
const comments = [];
let pendingAction = null; 

/* ===== Middleware ===== */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "demo-secret",
  resave: false,
  saveUninitialized: true
}));

/* ===== Routes Accueil ===== */
app.get("/", (req, res) => {
  res.send(`
    <h2>Demo HTTP Smuggling</h2>
    <p>Simulez une interception de données par désynchronisation.</p>
    <a href="/register"><button>Créer un compte</button></a> 
    <a href="/login"><button>Se connecter</button></a>
  `);
});

/* ===== Inscription & Connexion ===== */
app.get("/register", (req, res) => {
  res.send(`<h3>Inscription</h3><form method="POST"><input name="username" placeholder="Nom d'utilisateur" required /><input name="password" type="password" placeholder="Mot de passe" required /><button>S'inscrire</button></form>`);
});

app.post("/register", (req, res) => {
  users.push(req.body);
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.send(`<h3>Connexion</h3><form method="POST"><input name="username" placeholder="User" required /><input name="password" type="password" placeholder="Pass" required /><button>Login</button></form>`);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const u = users.find(x => x.username === username && x.password === password);
  
  if (!u) return res.send("Identifiants invalides. <a href='/login'>Réessayer</a>");

  req.session.user = u.username;

  // 🔥 LE PIÈGE : Fusion des variables (Smuggling Simulation)
  if (pendingAction === "LEAK_NEXT_LOGIN") {
    // On récupère le commentaire de l'attaquant qui attendait "la suite"
    const victimData = ` POST /login HTTP/1.1\nHost: ton-site.render.com\nusername=${username}&password=${password}`;
    
    if (comments.length > 0) {
        // On ajoute directement les infos de la victime à la fin du texte existant
        comments[comments.length - 1].content += victimData;
    }
    pendingAction = null; // Désactive le piège
  }

  res.redirect("/forum");
});

/* ===== Forum ===== */
app.get("/forum", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.send(`
    <div style="display:flex; justify-content: space-between; align-items: center;">
        <h2>Forum de Discussion</h2>
        <a href="/logout"><button>Déconnexion</button></a>
    </div>
    <p>Connecté en tant que : <b>${req.session.user}</b></p>

    <form method="POST" action="/comment">
      <p>Laissez un commentaire :</p>
      <textarea name="content" rows="5" cols="60" required placeholder="Votre message..."></textarea><br>
      <button type="submit">Publier</button>
    </form>
    <hr>
    <h3>Derniers messages</h3>
    ${comments.map(c => `
        <div style="border:1px solid #ccc; margin:10px; padding:10px; background: #f9f9f9;">
            <b>${c.user} :</b>
            <pre style="white-space: pre-wrap; background: #eee; padding: 5px;">${c.content}</pre>
        </div>`).reverse().join("")}
  `);
});

app.post("/comment", (req, res) => {
  const text = req.body.content;

  // Simulation de la détection de la requête "maquillée"
  if (text.includes("POST /") || text.includes("Content-Length:")) {
    pendingAction = "LEAK_NEXT_LOGIN";
  }

  comments.push({
    user: req.session.user || "Anonyme",
    content: text
  });

  res.redirect("/forum");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.listen(PORT, () => console.log("Serveur démarré sur le port", PORT));
