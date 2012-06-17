var mongoose = require('mongoose')
var User = mongoose.model("User", User);

// ****** User Profile / Signup / Login ******
exports.get = function (req, res) {
    var auth = req.session.auth
    // If logged in, profile
    if(auth && auth.loggedIn){
        User.findOne({facebook: auth.facebook.user.id}, function(err, person){
            if(err) res.send(err, 400)
            res.render(__dirname + '/views/user.jade', {title: "User Profile", person: person, edit: "true"});
        })
    }
    else{
        res.render(__dirname + '/views/signup.jade', {title: "Sign Up"});
    }   
}

// ****** User Update ******
exports.update = function(req, res){
    // Validate the entry
    var body = req.body
    var auth = req.session.auth
    var id = ""
    if (auth && auth.facebook.user)
        var id = auth.facebook.user.id
    req.body.phone = twilio.phoneUS(req.body.phone)
    if(!req.body.notify) req.body.notify = []
    User.update({facebook: id}, req.body, function(err, updated){
        res.redirect('/user')
    })
}

// ****** User Profile ******
exports.view = function (req, res) {
    var id = req.params.id;
    // If logged in, profile
    User.findOne({_id: id}, function(err, result){
        if(err) res.send(err, 400)
        res.render(__dirname + '/views/user.jade', {title: "User Profile", person: result, edit:"false"});
    })
}