
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
  secret: 'becobeco',
  resave: false,
  saveUninitialized: true,
}))
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect('mongodb://bedobeco:fedb9b30@ac-grzyoqg-shard-00-00.jdnpzif.mongodb.net:27017,ac-grzyoqg-shard-00-01.jdnpzif.mongodb.net:27017,ac-grzyoqg-shard-00-02.jdnpzif.mongodb.net:27017/?ssl=true&replicaSet=atlas-kmki78-shard-0&authSource=admin&retryWrites=true&w=majority');
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
   // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
  res.redirect("/login");
}
});
app.post("/submit",function(req,res){
  const secret = req.body.secret;
  console.log(req.user);
  User.findById(req.user.id,function(err,found){
    if(err){
      console.log(err);
    }
    else{
      if(found){
        found.secret = secret;
        found.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/",function(req,res){
  res.render("home");
});

app.get("/login",function(req,res){
res.render("login");
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/register",function(req,res){
res.render("register");
});

app.get("/secrets",function(req,res){
User.find({},function(err,found){
  if(found){
    res.render("secrets",{secret:found});
  }
});
});
app.post("/register",function(req,res){
  User.register({username:req.body.username }, req.body.password, function(err, user) {
    if(err){
      res.send("fuck");
    }
    else{
      passport.authenticate('local')(req,res,function(){
        res.redirect("/secrets");
      });
  }
});
});
app.post("/login",passport.authenticate('local', { failureRedirect: '/' }),function(req,res){
res.redirect("/secrets");
});
app.get("/logout",function(req,res){
  req.logout(function(err){
    if(err){
      res.send(err);
    }
    else{
      res.redirect("/");
    }
  });
});
app.listen(3000,function(){
  console.log("rise and shine");
});
