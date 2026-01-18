const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== In-memory storage ===== */
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

/* ===== Routes ===== */

app.get("/", (req, res) => {
  res.send(`
    <h2>Forum Demo</h2>
    <p>Simulate a pedagogical HTTP Request Smuggling attack.</p>
    <a href="/register"><button>Register</button></a> 
    <a href="/login"><button>Login</button></a>
  `);
});

/* ===== Register & Login ===== */
app.get("/register", (req, res) => {
  res.send(`
    <h3>Register</h3>
    <form method="POST">
      <input name="username" placeholder="User" required />
      <input name="password" type="password" placeholder="Pass" required />
      <button>Create Account</button>
    </form>
    <br>
    <a href="/"><button>Return to Dashboard</button></a>
  `);
});

app.post("/register", (req, res) => {
  users.push(req.body);
  res.send(`
    <h3>Account Created Successfully!</h3>
    <p>You can now return to the dashboard or login.</p>
    <a href="/"><button>Return to Dashboard</button></a>
    <a href="/login"><button>Go to Login</button></a>
  `);
});

app.get("/login", (req, res) => {
  res.send(`
    <h3>Login</h3>
    <form method="POST">
      <input name="username" placeholder="User" required />
      <input name="password" type="password" placeholder="Pass" required />
      <button>Login</button>
    </form>
    <br>
    <a href="/"><button>Return to Dashboard</button></a>
  `);
});

app.post("/login", (req, res) => {
  const u = users.find(x => x.username === req.body.username && x.password === req.body.password);
  if (!u) return res.send("Invalid login. <a href='/login'>Try again</a>");

  req.session.user = u.username;

  // 🔥 FIXED LEAK LOGIC
  if (pendingAction === "LEAK_NEXT_LOGIN") {
    if (comments.length > 0) {
        // We append the victim data to the attacker's last comment
        // No more "Ma session a été compromise"
        comments[comments.length - 1].content += `\n[DATA_EXTRACTED] User: ${u.username} | Pass: ${u.password}`;
    }
    pendingAction = null; 
  }

  res.redirect("/forum");
});

/* ===== Forum & Logout ===== */
app.get("/forum", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

  res.send(`
    <div style="display:flex; justify-content: space-between; align-items: center;">
        <h2>Forum</h2>
        <a href="/logout"><button>Logout</button></a>
    </div>
    <p>Logged as: <b>${req.session.user}</b></p>

    <form method="POST" action="/comment">
      <p>Post a comment (or try your smuggling payload):</p>
      <textarea name="content" rows="5" cols="50" required placeholder="Write here..."></textarea><br><br>
      <button type="submit">Post Comment</button>
    </form>
    <hr>
    <h3>Recent Posts</h3>
    ${comments.map(c => `
      <div style="border:1px solid #ccc; margin:10px; padding:10px; background:#f4f4f4;">
        <b>${c.user}:</b>
        <pre style="white-space: pre-wrap; font-family: monospace;">${c.content}</pre>
      </div>`).reverse().join("")}
  `);
});

app.post("/comment", (req, res) => {
  const text = req.body.content;

  // Detection logic for the demo
  if (text.includes("POST /") || text.includes("Content-Length:")) {
    pendingAction = "LEAK_NEXT_LOGIN";
  }

  comments.push({
    user: req.session.user || "Anonymous",
    content: text
  });

  res.redirect("/forum");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.listen(PORT, () => console.log("Server running on port", PORT));
