require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = new mongoose.model("User", userSchema);

app.listen(3000, function () {
  console.log("Server started on port 3000.");
});

app.get("/", function (req, res) {
  res.render("home");
});

app
  .route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(function (req, res) {
    const username = req.body.username;
    const password = md5(req.body.password);

    User.findOne({ email: username }).then(function (foundUser) {
      if (foundUser) {
        if (foundUser.password === password) {
          res.render("secrets");
        } else {
          console.log("Incorrect username and/or password.");
          res.redirect("/");
        }
      } else {
        console.log("Incorrect username and/or password.");
        res.redirect("/");
      }
    });
  });

app
  .route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(function (req, res) {
    const newUser = new User({
      email: req.body.username,
      password: md5(req.body.password),
    });
    newUser.save().then(function (UserSaved) {
      if (UserSaved) {
        res.render("secrets");
      }
    });
  });
