require('../models.js')
var mongoose = require('mongoose')
var User = mongoose.model("User", User);
var Event = mongoose.model("Event", Event);

exports.index = function (req, res) {
    res.redirect('/home')
}

// ****** Home Page ******
exports.home = function (req, res) {
    // If there is a user, get that object, render a partial
    // Get 3 events for the data object
    Event.find({}).limit(3).populate('_creator').populate('_guests').exec(function(err, events){
        if(err) res.send(err, 400)
        res.render(__dirname + '/../views/home.jade', {title: "Home", events: events});
    })
}

exports.last = function(req, res){
    var path = (req.session && req.session.return_path) ? req.session.return_path : "/"
    res.redirect(path)
}

exports.login = function(req, res){
    res.render(__dirname + '/../views/signup.jade', {title: "Sign Up"});
}

exports.about = function(req, res){
    res.render(__dirname + '/../views/about.jade', {title: "About"});
}

exports.contact = function(req, res){
    res.render(__dirname + '/../views/contact.jade', {title: "Contact"});
}
