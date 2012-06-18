var mongoose = require('mongoose')
var Event = mongoose.model("Event", Event);
var User = mongoose.model("User", User);


// ****** Event List/Search ******
exports.get = function (req, res) {
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
        res.render(__dirname + '/../views/eventlist.jade', {title: "Events List", events: events, page: (skip/limit + 1), limit: limit});
    })
}

exports.update = function(req, res){
    var body = req.body
    var eventObject = new Event(body);

    eventObject.save(function(err){
        if(err) res.send(err, 400)
        //res.render(__dirname + '/views/event.jade', {title: "Post Event", event: eventObject});
        res.redirect('/event/' + eventObject._id) 
    });
}

// ****** Event Create ******
exports.create = function(req, res){
    var auth = req.session.auth
    var facebookid = auth.facebook.user.id
    User.findOne({"facebook":facebookid}, function (err, host){
        if(err) res.send(err, 400)
        res.render(__dirname + '/views/eventcreate.jade', {title: "Create Event", host: host});
    })

    
}

// ****** Event Profile ******
exports.get_id = function (req, res) {
    var id = req.params.id;
    var facebookid = (req.session.auth && req.session.auth.loggedIn) ? req.session.auth.facebook.user.id : ""
    // If logged in, profile
    Event.findOne({_id: id}).populate('_creator').populate('_guests').exec(function(err, event){
        if(event){
            User.findOne({'facebook': facebookid}, function(err, person){
                res.render(__dirname + '/../views/event.jade', {title: "Event Info", event: event, person: person});
            })
        }
        else
            res.send(err, 400)
    })
}

// ****** Join an event ******
exports.join = function (req, res) {
    // Assume agreed to requirements
    var id = req.params.id;
    // If logged in, profile
    Event.findOne({_id: id}).populate('_creator').exec(function(err, event){
        if(err) res.send(err, 400)
        User.findOne({facebook: req.session.auth.facebook.user.id}, function(err, person){
            if(err) res.send(err, 400)
            if(event._guests.indexOf(person._id) == -1)
                event._guests.push({_id: person._id, name: person.name, approval: 'pending'})
            event.save()
            // Notify the host through their method
            // if(event._creator.notify.indexOf("sms") != -1)
            //     twilio.sendText(host.phone, person.name + " has asked to join your event " + event.title)
            res.redirect('/event/' + id)
            //res.render(__dirname + '/views/event.jade', {title: "Add Event", event: event, person: person});
        })
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