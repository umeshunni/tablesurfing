var twilio = require('../twilio.js')
  , config = require('../config.js')
  , knox = require('knox')

var mongoose = require('mongoose')
var User = mongoose.model("User", User);

// ****** User Profile / Signup / Login ******
exports.get = function (req, res) {
    // If logged in, profile
    res.render(__dirname + '/../views/user.jade', {title: "Profile", user: req.user, edit: "true", missing:req.query.missing});
}

// ****** User Update ******
exports.update = function(req, res){
    // Validate the entry
    var body = req.body
    var auth = req.session.auth
    var id = ""
    if (req.user)
        var id = req.user._id
    req.body.phone = twilio.phoneUS(req.body.phone)
    if(!req.body.notify) req.body.notify = []
        
    if(req.files && req.files.picture && req.files.picture.size > 0){
        // Used for uploading pictures
        var client = knox.createClient({
            key: config.aws.key
          , secret: config.aws.secret
          , bucket: config.aws.bucket
        });

        var host = "http://" + config.aws.bucket + ".s3.amazonaws.com"
        var path = "/images/user/" + id

        client.putFile(req.files.picture.path, path, function(err, result){
            if(err) res.send(err, 400)
            req.body.picture = host + path
            User.update({_id: id}, req.body, function(err, updated){
                res.redirect('/user')
            })
        })
    }
    else{
        User.update({_id: id}, req.body, function(err, updated){
                res.redirect('/user')
            })
    }

}

// ****** User Profile ******
exports.view = function (req, res) {
    var id = req.params.id;
    // If logged in, profile
    User.findOne({_id: id}, function(err, result){
        if(err) res.send(err, 400)
        res.render(__dirname + '/../views/user.jade', {title: "User Profile", user: result, edit:"false"});
    })
}