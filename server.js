const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== In-memory demo storage ===== */
const users = [];
const comments = [];
let pendingAction = null; // ← action "smuggled"

/* ===== Middleware ===== */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "demo-secret",
  resave: false,
  saveUninitialized: true
}));

/* ===== NAIVE PROXY (simulated) ===== */
function naiveProxy(req, res, next) {
  // The proxy only checks the route & method
  if (req.method === "POST" && req.path === "/comment") {
    return next(); // allows blindly
  }
  next();
}

app.use(naiveProxy);

/* ===== Routes ===== */

app.get("/", (req, res) => {
  res.send(`
    <h2>Forum Demo</h2>
    <a href="/register">Register</a> |
    <a href="/login">Login</a>
  `);
});

/* ===== Register ===== */
app.get("/register", (req, res) => {
  res.send(`
    <h3>Register</h3>
    <form method="POST">
      <input name="username" required />
      <input name="password" required />
      <button>Register</button>
    </form>
  `);
});

app.post("/register", (req, res) => {
  users.push(req.body);
  res.redirect("/login");
});

/* ===== Login ===== */
app.get("/login", (req, res) => {
  res.send(`
    <h3>Login</h3>
    <form method="POST">
      <input name="username" required />
      <input name="password" required />
      <button>Login</button>
    </form>
  `);
});

app.post("/login", (req, res) => {
  const u = users.find(
    x => x.username === req.body.username && x.password === req.body.password
  );
  if (!u) return res.send("Invalid login");

  req.session.user = u.username;

  /* 🔥 EXECUTE SMUGGLED ACTION (if any) */
  if (pendingAction) {
    comments.push({
      user: "SYSTEM",
      content: `Leaked login detected: ${u.username}`
    });
    pendingAction = null;
  }

  res.redirect("/forum");
});

/* ===== Forum ===== */
app.get("/forum", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.send(`
    <h2>Forum</h2>
    <p>Logged as <b>${req.session.user}</b></p>

    <form method="POST" action="/comment">
      <textarea name="content" required></textarea><br>
      <button>Post</button>
    </form>

    <hr>

    ${comments.map(c =>
      `<p><b>${c.user}</b>: ${c.content}</p>`
    ).join("")}
  `);
});

/* ===== COMMENT (VULNERABLE BY DESIGN) ===== */
app.post("/comment", (req, res) => {
  const text = req.body.content;

  /* 🔥 SIMULATED SMUGGLED INSTRUCTION */
  if (text.includes("X-Next-Action: leak-next-login")) {
    pendingAction = "LEAK_NEXT_LOGIN";
  }

  comments.push({
    user: req.session.user,
    content: text
  });

  res.redirect("/forum");
});

/* ===== Start ===== */
app.listen(PORT, () => {
  console.log("Forum demo running on port", PORT);
});
