/********************************************************************************
* WEB322 – Assignment 03
*
* I declare that this assignment is my own work in accordance with Seneca's
* Academic Integrity Policy:
*
* https://www.senecapolytechnic.ca/about/policies/academic-integrity-policy.html
*
* Name: MUHAMMAD MOEEN CHARAGH
* Student ID: 135347243
* Date: TODAY
*
********************************************************************************/

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("client-sessions");
const { Sequelize } = require("sequelize");
require("dotenv").config();

// Models
const User = require("./models/User");
const Task = require("./models/Task");

const app = express();
const PORT = process.env.PORT || 3000;

// ================= DATABASES =================

// ✅ MongoDB (Users)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected "))
  .catch(err => console.log("MongoDB error:", err));

// ✅ PostgreSQL (Neon - Tasks)
const sequelize = new Sequelize(process.env.PG_URI, {
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Sync PostgreSQL
sequelize.sync()
  .then(() => console.log("PostgreSQL synced "))
  .catch(err => console.log("PostgreSQL error:", err));

// ================= VIEW ENGINE =================

app.set("view engine", "ejs");

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));

app.use(session({
  cookieName: "session",
  secret: "web322secret",
  duration: 30 * 60 * 1000
}));

// ================= AUTH MIDDLEWARE =================

function ensureLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// ================= ROUTES =================

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/dashboard", ensureLogin, (req, res) => {
  res.redirect("/tasks");
});

// ================= AUTH =================

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      email,
      password: hashedPassword
    });

    res.redirect("/login");
  } catch (err) {
    console.log(err);
    res.send("User already exists ");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) return res.send("User not found ");

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.send("Wrong password ");

    req.session.user = {
      id: user._id,
      username: user.username
    };

    res.redirect("/tasks");
  } catch (err) {
    console.log(err);
    res.send("Login error ");
  }
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/login");
});

// ================= TASKS =================

// View all tasks
app.get("/tasks", ensureLogin, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { userId: req.session.user.id }
    });

    res.render("tasks", { tasks });
  } catch (err) {
    console.log(err);
    res.send("Error loading tasks ");
  }
});

// Add page
app.get("/tasks/add", ensureLogin, (req, res) => {
  res.render("addTask");
});

// Add task
app.post("/tasks/add", ensureLogin, async (req, res) => {
  const { title, description, dueDate } = req.body;

  try {
    await Task.create({
      title,
      description,
      dueDate,
      userId: req.session.user.id
    });

    res.redirect("/tasks");
  } catch (err) {
    console.log(err);
    res.send("Error adding task ");
  }
});

// Delete task
app.post("/tasks/delete/:id", ensureLogin, async (req, res) => {
  try {
    await Task.destroy({
      where: {
        id: req.params.id,
        userId: req.session.user.id
      }
    });

    res.redirect("/tasks");
  } catch (err) {
    console.log(err);
    res.send("Error deleting task ");
  }
});

// Edit page
app.get("/tasks/edit/:id", ensureLogin, async (req, res) => {
  try {
    const task = await Task.findOne({
      where: {
        id: req.params.id,
        userId: req.session.user.id
      }
    });

    res.render("editTask", { task });
  } catch (err) {
    console.log(err);
    res.send("Error loading task ");
  }
});

// Update task
app.post("/tasks/edit/:id", ensureLogin, async (req, res) => {
  const { title, description, dueDate } = req.body;

  try {
    await Task.update(
      { title, description, dueDate },
      {
        where: {
          id: req.params.id,
          userId: req.session.user.id
        }
      }
    );

    res.redirect("/tasks");
  } catch (err) {
    console.log(err);
    res.send("Error updating task ");
  }
});

// Toggle status
app.post("/tasks/status/:id", ensureLogin, async (req, res) => {
  try {
    const task = await Task.findOne({
      where: {
        id: req.params.id,
        userId: req.session.user.id
      }
    });

    const newStatus = task.status === "pending" ? "completed" : "pending";

    await Task.update(
      { status: newStatus },
      {
        where: {
          id: req.params.id,
          userId: req.session.user.id
        }
      }
    );

    res.redirect("/tasks");
  } catch (err) {
    console.log(err);
    res.send("Error updating status ");
  }
});

// ================= START =================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});