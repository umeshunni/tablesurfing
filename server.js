
/**
 * Module dependencies.
 */
var port = process.env.PORT || 3000

var express = require('express')
  , routes = require('./routes')
  , hashlib = require('hashlib')
  , mongoose = require('mongoose')
  , twilio = require('./twilio')
  , mandrill = require('mandrill')
  , everyauth = require('everyauth');

mandrill.call({'key':'9cac9ade-0541-42cf-80d8-bbcc48338bf7'});

//mongoose.connect("mongo://localhost/tablesurfing"); // Old and busted
mongoose.connect("mongodb://nodeuser:oompabeard@staff.mongohq.com:10066/tablesurfing"); // New hotness
require('./models.js');
var User = mongoose.model("User", User);
var Event = mongoose.model("Event", Event);

// tablesurfing.org domain
// .appId('217422248376051')
// .appSecret('b9723de2871ddcd41b07ffe5a97e7f6a')
// localhost
// .appId('419312468089420')
// .appSecret('6f1c51f6ea13cf58c9f42d1c1feb2bac')

everyauth.facebook
.appId('419312468089420')
.appSecret('6f1c51f6ea13cf58c9f42d1c1feb2bac')
.fields('id,name,email,picture,location')
.findOrCreateUser( function(session, accessToken, accessTokenExtra, fbUserMetadata){
	var id = fbUserMetadata.id;
	var promise = this.Promise();
	User.findOne({ facebook: id}, function(err, result) {
		var user;
		if(!result) {
			user = new User();
			user.facebook = id;
			user.name = fbUserMetadata.name;
			user.picture = fbUserMetadata.picture;
			user.email = fbUserMetadata.email;
			user.save();
		} else {
			user = result;
		}
		promise.fulfill(user);
	});
	return promise;
})
.redirectPath('/last');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: "brown chicken brown cow" }));
  app.use(express.static(__dirname + '/public'));
  app.use(everyauth.middleware());
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.post('/sms', function(req, res){
	var from = twilio.phoneUS(req.body.From)
	var message = "<?xml version='1.0' encoding='UTF-8'?><Response><Sms>"
	// Where the phone number sms returns
	User.findOne({'phone': from}, function(err, host){
		if(err) return;
		if(host){
			// Do the action based on the body
			message += "Hello " + host.name + ". "
			// Demo - confirm all the user's pending guests
			//Event.update({}, {})
			Event.update({},{$set:{"guests.$.approval":"approved"}},{upsert: true}, function(err){
				console.log("updated all")
			});
			 
		}
		message += "Thank you for texting!" + from + "</Sms></Response>"
		res.contentType('xml')
		res.send(message)
	})
})


// ****** Root ******
app.get('/', function (req, res) {
	res.redirect('/home')
});

// ****** Home Page ******
app.get('/home', function (req, res) {
	// If there is a user, get that object, render a partial
	// Get 3 events for the data object
	Event.find({}).limit(3).exec(function(err, events){
		if(err) res.send(err, 400)
	    res.render(__dirname + '/views/home.jade', {title: "Home", events: events});
	})
	
});

app.get('/last', function(req, res){
	res.redirect('back')
})

// ****** User Profile / Signup / Login ******
app.get('/user', function (req, res) {
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
})

// ****** User Update ******
app.post('/user', function(req, res){
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
})

// ****** User Profile ******
app.get('/user/:id', function (req, res) {
	var id = req.params.id;
	// If logged in, profile
	User.findOne({_id: id}, function(err, result){
		if(err) res.send(err, 400)
		res.render(__dirname + '/views/user.jade', {title: "User Profile", person: result, edit:"false"});
	})
})

// ****** Event List/Search ******
app.get('/event', function (req, res) {
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
	    res.render(__dirname + '/views/eventlist.jade', {title: "Events List", events: events, page: (skip/limit + 1), limit: limit});
	})
})

// ****** Event Create ******
app.post('/event', function(req, res){
	var body = req.body
	if (req.session.auth && req.session.auth.loggedIn){
		var eventObject = new Event(body);
	
		eventObject.save(function(err){
			if(err) res.send(err, 400)
			//res.render(__dirname + '/views/event.jade', {title: "Post Event", event: eventObject});
			res.redirect('/event/' + eventObject._id) 
		});
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "Sign Up"});
	}
})

app.get('/event/create', function(req, res){
	if (req.session.auth && req.session.auth.loggedIn){
		var auth = req.session.auth
		var facebookid = auth.facebook.user.id
		User.findOne({"facebook":facebookid}, function (err, host){
			if(err) res.send(err, 400)
			res.render(__dirname + '/views/eventcreate.jade', {title: "Create Event", host: host});
		})
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "Sign Up"});
	}
	
})

// ****** Event Profile ******
app.get('/event/:id', function (req, res) {
	var id = req.params.id;
	var facebookid = (req.session.auth && req.session.auth.loggedIn) ? req.session.auth.facebook.user.id : ""
	// If logged in, profile
	Event.findOne({_id: id}, function(err, event){
		if(event){
			var creator = event.creator
			User.findOne({_id: creator}, function(err, host){
				if(err) res.send(err, 400)
				User.findOne({'facebook': facebookid}, function(err, person){
					res.render(__dirname + '/views/event.jade', {title: "Event Info", event: event, host: host, person: person});
				})
			})
		}
		else
			res.send(err, 400)
	})
})

// ****** Add a guest to an event ******
app.post('/event/:id', function (req, res) {
	var auth = req.session.auth
	if(auth && auth.loggedIn) 
	// Assume agreed to requirements
	var id = req.params.id;
	if(req.session.auth && req.session.auth.loggedIn){
		// If logged in, profile
		Event.findOne({_id: id}, function(err, event){
			if(err) res.send(err, 400)
			User.findOne({facebook: req.session.auth.facebook.user.id}, function(err, person){
				if(err) res.send(err, 400)
				event.guests.push({_id: person._id, name: person.name, approval: 'pending'})
				event.save()
				// Notify the host through their method
				User.findOne({_id: event.creator}, function(err, host){
					if(host.notify.indexOf("sms") != -1)
						twilio.sendText(host.phone, person.name + " has asked to join your event " + event.title)
				})
				res.redirect('/event/' + id)
				//res.render(__dirname + '/views/event.jade', {title: "Add Event", event: event, person: person});
			})
		})
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "Sign Up"});
	}
})

// ****** Confirm/Deny a guest ******
app.post('/event/:id/guest', function(req, res){
	// Updates the guest object
	var body = req.body
	if(req.session.auth && auth.loggedIn){
		User.find({_id:req.session.id}, function(err, host){ // Get the host
			if(err) res.send(err, 400)
			Event.find({_id:req.params.id}, function(err, event){
				if(err)res.send(err, 400)
				if(event.creator != host._id) res.send("Unauthorized", 401)
				
				event.guests = body
				// This may not be necessary
				// event.save(function(err){
				// 	   if(err) res.send(err, 400)
				// });
				res.render(__dirname + '/views/event.jade', {title: "Guests", event: event, person: host});
			})
		})
	}

})


app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});


