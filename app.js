require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture,
    });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FB_APPID,
      clientSecret: process.env.FB_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/secrets",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ facebookId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.listen(3000, function () {
  console.log("Server started on port 3000.");
});

app.get("/", function (req, res) {
  res.render("home");
});

// Google OAuth
app.route("/auth/google").get(
  passport.authenticate("google", {
    scope: ["profile"],
  })
);

app
  .route("/auth/google/secrets")
  .get(
    passport.authenticate("google", { failureRedirect: "/login" }),
    function (req, res) {
      // Successful authentication, redirect to secrets.
      res.redirect("/secrets");
    }
  );

// Facebook OAuth
app.route("/auth/facebook").get(passport.authenticate("facebook"));

app
  .route("/auth/facebook/secrets")
  .get(
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function (req, res) {
      // Successful authentication, redirect to secrets.
      res.redirect("/secrets");
    }
  );

// Finds all secrets submitted by users. (Users where submitted secret is not equal to null.)
app.route("/secrets").get(function (req, res) {
  User.find({ secret: { $ne: null } })
    .then(function (foundUser) {
      if (foundUser) {
        res.render("secrets", { usersWithSecrets: foundUser });
      }
    })
    .catch(function (err) {
      console.log(err);
    });
});

app
  .route("/submit")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post(function (req, res) {
    const submittedSecret = req.body.secret;
    User.findById(req.user.id)
      .then(function (foundUser) {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save().then(function () {
            res.redirect("/secrets");
          });
        }
      })
      .catch(function (err) {
        console.log(err);
      });
  });

app.route("/logout").get(function (req, res) {
  req.logout(function (err) {
    if (err) {
      console.log(err);
    }
    res.redirect("/");
  });
});

app
  .route("/login")
  .get(function (req, res) {
    res.render("login");
  })
  .post(passport.authenticate("local"), function (req, res) {
    res.redirect("/secrets");
  });

app
  .route("/register")
  .get(function (req, res) {
    res.render("register");
  })
  .post(function (req, res) {
    User.register(
      { username: req.body.username },
      req.body.password,
      function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
          });
        }
      }
    );
  });
