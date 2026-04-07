const pg = require("pg"); // force Vercel to include pg
const { Sequelize, DataTypes } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.PG_URI, {
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  dialectModule: pg // ✅ explicitly tell Sequelize to use pg
});

const Task = sequelize.define("Task", {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  dueDate: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "pending"
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

module.exports = { Task, sequelize };