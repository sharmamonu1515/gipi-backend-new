const fs = require("fs");
const cors = require("cors");
const express = require("express");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const session = require("express-session");
const config = require("./config");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());

// Middleware for JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Session setup
app.use(
  session({
    secret: "VcsFa3jI4IN4EEDbGRRo",
    // Forces the session to be saved back to the session store,
    // even if the session was never modified during the request
    resave: true,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 3 * 60 * 60, // Session expires in 3 hours
    }),
    duration: 3 * 60 * 60 * 1000, // how long the session will stay valid in ms
    cookie: {
      path: "/",
      httpOnly: true,
      secure: false,
      ephemeral: true, //cookie expires when the browser closes
      maxAge: 3 * 60 * 60 * 1000, //set the max age in case ephemeral not used
    },
  })
);

// Import and use router
const router = require("./router");
app.use("/", router);

// Start server
const PORT = process.env.APP_PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
