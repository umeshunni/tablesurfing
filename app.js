
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , hashlib = require('hashlib')
  , mongoose = require('mongoose')
  , twilio = require('./twilio')
  , mandrill = require('./mandrill');


  mongoose.connect("mongo://localhost/tablesurfing");
  require('./models.js');
  var User = mongoose.model("User", User);
  var Event = mongoose.model("Event", Event);


var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Session variables
app.use(express.cookieParser());
app.use(express.session({ secret: "brown chicken brown cow" }));

// Routes

app.post('/sms', function(req, res){
	// Where the phone number sms returns
	User.findOne({phone: req.body.from}, function(err, user){
		if(err) return;
		// Do the action based on the body
		
	})
	res.contentType('xml')
	res.send("<?xml version='1.0' encoding='UTF-8'?><Request><Sms>Thank you for texting!</Sms></Request>")
})


// ****** Root ******
app.get('/', function (req, res) {
	res.redirect('/home')
});

// ****** Home Page ******
app.get('/home', function (req, res) {
	// If there is a user, get that object, render a partial
	if(req.session && req.session.id){
		User.find({_id: req.session.id}, function(err, user){
			res.renderPartial(__dirname + "/partials/header.jade", user)
		})
	}
	
	// Get 3 events for the data object
	Event.find({}).limit(3).exec(function(err, events){
		if(err) res.send(err, 400)
	    res.render(__dirname + '/views/home.jade', {title: "home", events: events});
	})
	
});

// ****** User Profile / Signup / Login ******
app.get('/user', function (req, res) {
	// If logged in, profile
	if(req.session && req.session.id){
		User.findOne({_id: req.session.id}, function(err, user){
			if (user) {
				res.render(__dirname + '/views/user.jade', {title: "user", user: user});
			} else {
				res.send(err, 400)
			}
		})
	}
	else{
		res.render(__dirname + '/views/signup.jade', {title: "signup"});
	}	
})

// ****** User Create ******
app.post('/user', function(req, res){
	// Validate the entry
	var body = req.body
	var validFields = [
	  'name'
	, 'email'
	, 'phone'
	, 'address'
	, 'city'
	, 'zipcode'
	, 'picture'
	, 'password'
	, 'preferences'
	, 'notify'
	]

	// Scrub unnecessary fields
	for (key in body){
		if(validFields.indexOf(key) == -1){
			body.remove(key)
		}
	}	

	var userObject = new User(req.body);
	userObject.save(function(err){
		if(err) res.send(err, 400)
		res.render(__dirname + '/views/signup.jade', {title: "signup", message: "Your user has been created.  Please log in."});
	});
	

})

// ****** User Profile ******
app.get('/user/:id', function (req, res) {
	var id = req.params.id;
	// If logged in, profile
	User.findOne({_id: id}, function(err, user){
		if(user){
			res.render(__dirname + '/views/user.jade', {title: "user/:id", user: user});
 		}
		else
			res.send(err, 400)
	})
})

// ****** Event List/Search ******
app.get('/event', function (req, res) {
	// GET filters: city, creator, preference, date
	var filters = {}
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
	    res.render(__dirname + '/views/eventlist.jade', {title: "eventlist", events: events, page: (skip/limit + 1), limit: limit});
	})
})

// ****** Event Create ******
app.post('/event', function(req, res){
	var body = req.body
	req.session = {}
	req.session.id = "12345"
	if (req.session && req.session.id){
		var eventObject = new Event(body);
		eventObject.creator = req.session.id
	
		eventObject.save(function(err){
			if(err) res.send(err, 400)
			res.render(__dirname + '/views/event.jade', {title: "post event", event: eventObject});
			//res.redirect('/event/' + eventObject.id, 200)
		});
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "signup"});
	}
})

// ****** Event Profile ******
app.get('/event/:id', function (req, res) {
	var id = req.params.id;
	// If logged in, profile
	Event.findOne({_id: id}, function(err, event){
		if(event)
			res.render(__dirname + '/views/event.jade', {title: "event/:id", event: event});
		else
			res.send(err, 400)
	})
})

// ****** Add a guest to an event ******
app.post('/event/:id/add', function (req, res) {
	// Assume agreed to requirements
	var id = req.params.id;
	if(req.session && req.session.id){
		// If logged in, profile
		Event.findOne({_id: id}, function(err, event){
			if(err) res.send(err, 400)
			User.findOne({_id: req.session.id}, function(err, user){
				if(err) res.send(err, 400)
				event.guests.add({_id: user.id, name: user.name}, function(err, res){
					if(err) res.send(err, 400)
					// Notify the host through their method
					User.findOne({_id: event.creator}, function(err, host){
						if(host.notify.indexOf("sms") != -1)
							twilio.sendText(host.phone, user.name + " has asked to join your event " + event.title)
						if(host.notify.indexOf("email") != -1)
							mandrill.sendEmail(host.email, "You created an event", "Zomg you are so good at this", ['event-add'], function(err, res){
								console.log(res)
							})
					})
					res.render(__dirname + '/views/add.jade', {title: ":id/add", result: res});
				})
			})
		})
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "signup"});
	}
})

// ****** Confirm/Deny a guest ******
app.post('/event/:id/confirm', function(req, res){
	// Updates the guest object
	var body = req.body
	if(req.session && req.session.id){
		User.find({_id:req.session.id}, function(err, user){ // Get the host
			if(err) res.send(err, 400)
			Event.find({_id:req.params.id}, function(err, event){
				if(err)res.send(err, 400)
				if(event.creator != user._id) res.send("Unauthorized", 401)
				
				event.guests = body
				// This may not be necessary
				// event.save(function(err){
				// 	   if(err) res.send(err, 400)
				// });
				res.render(__dirname + '/views/event.jade', {title: "event/:id", event: event});
			})
		})
	}

})


app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});



