/********************************************************************************
* WEB322 – Assignment 03
*
* Name: MUHAMMAD MOEEN CHARAGH
* Student ID: 135347243
********************************************************************************/

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("client-sessions");
const path = require("path");
require("dotenv").config();

// Models
const User = require("./models/User");
const { Task, sequelize } = require("./models/Task"); // ✅ FIXED

const app = express();
const PORT = process.env.PORT || 3000;

// ================= DATABASES =================

// MongoDB (Users)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

// ✅ FIXED: Sync PostgreSQL (VERY IMPORTANT)
sequelize.sync({ alter: true })
  .then(() => console.log("Postgres DB synced"))
  .catch(err => console.log("Sequelize error:", err));

// ================= VIEW ENGINE =================

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));

app.use(session({
  cookieName: "session",
  secret: process.env.SESSION_SECRET || "web322secret",
  duration: 30 * 60 * 1000
}));

// ================= AUTH MIDDLEWARE =================

function ensureLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// ================= ROUTES =================

app.get("/", (req, res) => {
  if (req.session.user) {
    res.redirect("/tasks");
  } else {
    res.redirect("/login");
  }
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
      id: user._id.toString(),
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

app.get("/tasks", ensureLogin, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { userId: req.session.user.id }
    });

    res.render("tasks", { tasks, user: req.session.user });
  } catch (err) {
    console.log("TASK ERROR:", err); // ✅ better logging
    res.send("Error loading tasks.");
  }
});

app.get("/tasks/add", ensureLogin, (req, res) => {
  res.render("addTask", { user: req.session.user });
});

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

// Local run
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}