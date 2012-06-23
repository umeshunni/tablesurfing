var mongoose = require('mongoose')
 , knox = require('knox')
 , mandrill = require('mandrill')
, config = require('../config.js')

var Event = mongoose.model("Event", Event);
var User = mongoose.model("User", User);
var Guest = mongoose.model("Guest", Guest);


mandrill.call({'key':config.mandrill.key});

// ****** New Event Form ******
exports.get = function(req, res){
    
    User.findOne({_id:req.user._id}, function (err, host){
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
    Event.findOne({_id: id}).populate('_creator').populate('guests._user').exec(function(err, event){
        if(err) res.send(err, 400)
        res.render(__dirname + '/../views/event.jade', {title: "Event Info", event: event, user: req.user});
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
        if(err) res.send(err, 400)

        var g = new Guest()
        g._user = req.user._id
        g.save()
        event.guests.push(g)
        event.save()
        // Notify the host through their method
        // if(event._creator.notify.indexOf("sms") != -1)
        //     twilio.sendText(event._creator.phone, req.user.name + " has asked to join your event " + event.title)
        var message = {
                "html":"<p>" + req.user.name + " has joined your event: " + event.title + " </p>"
                , "subject":"Placemat - Person joined"
                , "from_email":"noreply@tablesurfing.org"
                , "to":[{"email":event._creator.email}]
                , "tags":["event", "join"]
            }

        mandrill.call({
            "type":"messages"
            ,"call":"send"
            ,'message':message
        }, function(data){
                console.log(data);
            }
        );

        res.redirect('/event/' + id)
        //res.render(__dirname + '/views/event.jade', {title: "Add Event", event: event, user: req.user});
    })
}

// ****** Confirm/Deny a guest ******
exports.post_id_guest = function(req, res){
    // Updates the guest object
    var eventId = req.params.eventId
    var guestId = req.params.guestId
    var approval = req.params.approval
    Event.findById(eventId, function(err, event){
        if(err) res.send(err, 400)
        if(!event._creator.equals(req.user._id)) res.send("Unauthorized", 401)
        else{
            event.guests.id(guestId).approval = approval
            event.save()
            res.redirect('/event/' + eventId)
        }
    })
}

// ****** Event List/Search ******
exports.list = function (req, res) {
    // GET filters: city, creator, preference, date
    var filter = {}
    if(req.query){
        if(req.query.creator) filter._creator = req.query.creator
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
