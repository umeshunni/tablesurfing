var mongoose = require('mongoose')
 , knox = require('knox')
 , config = require('../config.js')

var Event = mongoose.model("Event", Event);
var User = mongoose.model("User", User);


// ****** New Event Form ******
exports.get = function(req, res){
    
    User.findOne({_id:req.session.account._id}, function (err, host){
        if(err) res.send(err, 400)
        res.render(__dirname + '/../views/eventcreate.jade', {title: "Create Event", host: host});
    })

    
}

// ****** Post New Event ******
exports.post = function(req, res){
    var body = req.body
    var eventObject = new Event(body);
        //res.render(__dirname + '/views/event.jade', {title: "Post Event", event: eventObject});
    
    // It's saved, upload files if necessary
    if(req.files && req.files.picture && req.files.picture.size > 0){
        // Used for uploading pictures
        var client = knox.createClient({
            key: config.aws.key
          , secret: config.aws.secret
          , bucket: config.aws.bucket
        });

        var host = "http://" + config.aws.bucket + ".s3.amazonaws.com"
        var path = "/images/event/" + eventObject._id

        client.putFile(req.files.picture.path, path, function(err, result){
            if(err) res.send(err, 400)
            eventObject.picture = "" + host + path
            eventObject.save(function(err){
                if(err) res.send(err, 400)
                res.redirect('/event/' + eventObject._id)
            })
        })
    }
    else{
        res.redirect('/event/' + eventObject._id)
    }
}


// ****** Event Profile ******
exports.get_id = function (req, res) {
    var id = req.params.id;

    // If logged in, profile
    Event.findOne({_id: id}).populate('_creator').populate('_guests').exec(function(err, event){
        if(err) res.send(err, 400)
        res.render(__dirname + '/../views/event.jade', {title: "Event Info", event: event, account: req.session.account});
    })
}

// ****** Update Event ******
exports.post_id = function(req, res){
    var body = req.body
    
        if(req.files && req.files.picture && req.files.picture.size > 0){
            // Used for uploading pictures
            var client = knox.createClient({
                key: config.aws.key
              , secret: config.aws.secret
              , bucket: config.aws.bucket
            });

            var host = "http://" + config.aws.bucket + ".s3.amazonaws.com"
            var path = "/images/event/" + req.params.id

            client.putFile(req.files.picture.path, path, function(err, result){
                if(err) res.send(err, 400)
                Event.update({_id: req.params.id}, {"picture":host+path}, function(err, updated){
                    res.redirect('/event/' + req.params.id)
                })
            })
        }
        else{
            res.redirect('/event/' + eventObject._id)
        }
}

// ****** Join an event ******
exports.join = function (req, res) {
    // Assume agreed to requirements
    var id = req.params.id;
    // If logged in, profile
    Event.findOne({_id: id}).populate('_creator').exec(function(err, event){
        if(err) res.send(err, 400)
        var account = req.session.account
        if(err) res.send(err, 400)
        if(event._guests.indexOf(account._id) == -1)
            event._guests.push({_id: account._id, name: account.name, approval: 'pending'})
        event.save()
        // Notify the host through their method
        // if(event._creator.notify.indexOf("sms") != -1)
        //     twilio.sendText(event._creator.phone, account.name + " has asked to join your event " + event.title)
        res.redirect('/event/' + id)
        //res.render(__dirname + '/views/event.jade', {title: "Add Event", event: event, account: account});
    })
}

// ****** Confirm/Deny a guest ******
exports.post_id_guest = function(req, res){
    // Updates the guest object
    var body = req.body
    User.find({_id:req.session.id}, function(err, host){ // Get the host
        if(err) res.send(err, 400)
        Event.find({_id:req.params.id}, function(err, event){
            if(err)res.send(err, 400)
            if(event.creator != host._id) res.send("Unauthorized", 401)
            
            event.guests = body
            // This may not be necessary
            // event.save(function(err){
            //     if(err) res.send(err, 400)
            // });
            res.render(__dirname + '/../views/event.jade', {title: "Guests", event: event, person: host});
        })
    })

}

// ****** Event List/Search ******
exports.list = function (req, res) {
    // GET filters: city, creator, preference, date
    var filter = {}
    if(req.query){
        if(req.query.creator) filter.creator = req.query.creator
        if(req.query.preference) filter.preference = req.query.preference.split(',')
        if(req.query.date) filter.date = req.query.date
        if(req.query.city) filter.city = req.query.city
    }
    // GET skip/limit
    var skip = req.param('skip', 0)
    var limit = req.param('limit', 10)
    Event.find(filter)
        .skip(skip)
        .limit(limit)
        .exec(function(err, events){
        res.render(__dirname + '/../views/eventlist.jade', {title: "Events", events: events, page: (skip/limit + 1), limit: limit});
    })
}
