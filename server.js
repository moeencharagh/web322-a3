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
const bcrypt = require("bcryptjs"); // ✅ FIXED: was "bcrypt" (native module crashes on Vercel)
const session = require("client-sessions");
const { Sequelize } = require("sequelize");
require("dotenv").config();

// Models
const User = require("./models/User");
const { Task } = require("./models/Task"); // ✅ FIXED: destructure since Task.js now exports { Task, sequelize }

const app = express();
const PORT = process.env.PORT || 3000;

// ================= DATABASES =================

// ✅ MongoDB (Users)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

// ✅ PostgreSQL (Neon - Tasks) — connection is handled inside Task.js
// No need to create a second Sequelize instance here

// ================= VIEW ENGINE =================

app.set("view engine", "ejs");

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));

app.use(session({
  cookieName: "session",
  secret: process.env.SESSION_SECRET || "web322secret", // ✅ FIXED: use env variable
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
  res.render("dashboard", { user: req.session.user });
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
    res.send("User already exists or invalid input.");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) return res.send("User not found.");

    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.send("Wrong password.");

    req.session.user = {
      id: user._id.toString(), // ✅ FIXED: convert ObjectId to string for PostgreSQL userId field
      username: user.username,
      email: user.email
    };

    res.redirect("/tasks");
  } catch (err) {
    console.log(err);
    res.send("Login error.");
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

    res.render("tasks", { tasks, user: req.session.user });
  } catch (err) {
    console.log(err);
    res.send("Error loading tasks.");
  }
});

// Add page
app.get("/tasks/add", ensureLogin, (req, res) => {
  res.render("addTask", { user: req.session.user });
});

// Add task
app.post("/tasks/add", ensureLogin, async (req, res) => {
  const { title, description, dueDate } = req.body;

  try {
    await Task.create({
      title,
      description,
      dueDate: dueDate || null,
      userId: req.session.user.id
    });

    res.redirect("/tasks");
  } catch (err) {
    console.log(err);
    res.send("Error adding task.");
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
    res.send("Error deleting task.");
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

    if (!task) return res.send("Task not found.");

    res.render("editTask", { task, user: req.session.user });
  } catch (err) {
    console.log(err);
    res.send("Error loading task.");
  }
});

// Update task
app.post("/tasks/edit/:id", ensureLogin, async (req, res) => {
  const { title, description, dueDate } = req.body;

  try {
    await Task.update(
      { title, description, dueDate: dueDate || null },
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
    res.send("Error updating task.");
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

    if (!task) return res.send("Task not found.");

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
    res.send("Error updating status.");
  }
});

// ================= START =================

module.exports = app;