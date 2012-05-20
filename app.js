
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , hashlib = require('hashlib')
  , mongoose = require('mongoose')
  , twilio = require('./twilio')
  , mandrill = require('./mandrill')
  , everyauth = require('everyauth');


mongoose.connect("mongo://localhost/tablesurfing");
require('./models.js');
var User = mongoose.model("User", User);
var Event = mongoose.model("Event", Event);

everyauth.facebook
.appId('217422248376051')
.appSecret('b9723de2871ddcd41b07ffe5a97e7f6a')
.findOrCreateUser( function(session, accessToken, accessTokenExtra, fbUserMetadata){
var id = fbUserMetadata.id;
var promise = this.Promise();
User.findOne({ facebook: id}, function(err, result) {
	var user;
	if(!result) {
		user = new User();
		user.facebook = id;
		user.name = fbUserMetadata.name;
		user.save();
	} else {
		user = result;
	}
	// Set session variables I suppose
	
	promise.fulfill(user);
	});
	return promise;
})
.redirectPath('/user');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
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

everyauth.helpExpress(app);

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
	console.log(everyauth.facebook.user)
	// If there is a user, get that object, render a partial
	// Get 3 events for the data object
	Event.find({}).limit(3).exec(function(err, events){
		if(err) res.send(err, 400)
	    res.render(__dirname + '/views/home.jade', {title: "TableSurfing - Home", events: events});
	})
	
});

// ****** User Profile / Signup / Login ******
app.get('/user', function (req, res) {
	var auth = req.session.auth
	// If logged in, profile
	if(auth && auth.loggedIn){
		User.findOne({facebook: auth.facebook.user.id}, function(err, person){
			if(err) res.send(err, 400)
			res.render(__dirname + '/views/user.jade', {title: "TableSurfing - User Profile", person: person, edit: "true"});
		})
	}
	else{
		res.render(__dirname + '/views/signup.jade', {title: "TableSurfing - Sign Up"});
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
		result = { name: 'Alex Swan',
  facebook: '17823529',
  _id: "4fb8c9e24dc1ed534b000001",
  photos: [],
  notify: [],
  preferences: [],
  created: '1337510370205' }
		res.render(__dirname + '/views/user.jade', {title: "TableSurfing - User Profile", person: result, edit:"false"});
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
	    res.render(__dirname + '/views/eventlist.jade', {title: "TableSurfing - Events List", events: events, page: (skip/limit + 1), limit: limit});
	})
})

// ****** Event Create ******
app.post('/event', function(req, res){
	var body = req.body
	if (req.session.auth && req.session.auth.loggedIn){
		var eventObject = new Event(body);
	
		eventObject.save(function(err){
			if(err) res.send(err, 400)
			//res.render(__dirname + '/views/event.jade', {title: "TableSurfing - Post Event", event: eventObject});
			res.redirect('/event/' + eventObject._id, 200)
		});
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "TableSurfing - Sign Up"});
	}
})

app.get('/event/create', function(req, res){
	if (req.session.auth && req.session.auth.loggedIn){
		var auth = req.session.auth
		var facebookid = auth.facebook.user.id
		User.findOne({"facebook":facebookid}, function (err, host){
			if(err) res.send(err, 400)
			res.render(__dirname + '/views/eventcreate.jade', {title: "TableSurfing - Create Event", host: host});
		})
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "TableSurfing - Sign Up"});
	}
	
})

// ****** Event Profile ******
app.get('/event/:id', function (req, res) {
	var id = req.params.id;
	// If logged in, profile
	Event.findOne({_id: id}, function(err, event){
		if(event){
			var creator = event.creator
			User.findOne({_id: creator}, function(err, host){
				if(err) res.send(err, 400)
				res.render(__dirname + '/views/event.jade', {title: "TableSurfing - Event Info", event: event, host: host});
			})
		}
		else
			res.send(err, 400)
	})
})

// ****** Add a guest to an event ******
app.post('/event/:id/add', function (req, res) {
	// Assume agreed to requirements
	var id = req.params.id;
	if(req.session.auth && req.session.auth.loggedIn){
		// If logged in, profile
		Event.findOne({_id: id}, function(err, event){
			if(err) res.send(err, 400)
			User.findOne({facebook: req.session.auth.facebook.user.id}, function(err, user){
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
					res.render(__dirname + '/views/add.jade', {title: "TableSurfing - Add Event", result: res});
				})
			})
		})
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "TableSurfing - Sign Up"});
	}
})

// ****** Confirm/Deny a guest ******
app.post('/event/:id/guests', function(req, res){
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
				res.render(__dirname + '/views/event.jade', {title: "TableSurfing - Guests", event: event});
			})
		})
	}

})


app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});



