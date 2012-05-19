
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , hashlib = require('hashlib')
  , mongoose = require('mongoose')
  , twilio = require('./twilio')
  , facebook = require('facebook');


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
  app.use(facebook.Facebook, {
        apiKey: '176941975674666', 
        apiSecret: '36095cf93f7aa776e25b90a4c29e4b64'
    })
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
		User.find({id: req.session.id}, function(err, user){
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
		User.findOne({id: req.session.id}, function(err, user){
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
	//req.send("Pending", 200)
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
	User.findOne({id: id}, function(err, user){
		if(user)
			res.render(__dirname + '/views/user.jade', {title: "user/:id", user: user});
		else
			res.send(err, 400)
	})
})

// ****** Event List ******
app.get('/event', function (req, res) {
	var limit = 10
	Event.find().limit(5).exec(function(err, events){
	    res.render(__dirname + '/views/eventlist.jade', {title: "eventlist", events: events, page: 1, limit: limit});
	})
})

// ****** Event Search ******
app.post('/event', function(req, res){
	var body = req.body
	res.send("Pending", 200)
})

app.post('/event', function(req, res){
	var body = req.body
	if (req.session && req.session.id){
		var eventObject = new User(body);
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
	Event.findOne({id: id}, function(err, event){
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
		Event.findOne({id: id}, function(err, event){
			if(err) res.send(err, 400)
			User.findOne({id: req.session.id}, function(err, user){
				if(err) res.send(err, 400)
				event.guests.add({id: user.id, name: user.name}, function(err, res){
					if(err) res.send(err, 400)
					// Notify the host through their method
					User.findOne({id: event.creator}, function(err, host){
						if(host.notify.indexOf("sms") != -1)
							twilio.sendText(host.phone, user.name + " has asked to join your event " + event.title)
						if(host.notify.indexOf("email") != -1)
							console.log("Be sure to drink your Ovaltine"); // Send an email to the host
					})
					res.render(__dirname + '/views/add.jade', {title: ":id/add", result: res});
				})
			})
		})
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "signup"});
	}
})


// Called to get information about the current authenticated user
app.get('/fbSession', function(){
  var fbSession = this.fbSession()

  if(fbSession) {
    // Here would be a nice place to lookup userId in the database
    // and supply some additional information for the client to use
  }

  // The client will only assume authentication was OK if userId exists
  this.contentType('json')
  this.halt(200, JSON.stringify(fbSession || {}))
})

// Called after a successful FB Connect
app.post('/fbSession', function() {
  var fbSession = this.fbSession() // Will return null if verification was unsuccesful

  if(fbSession) {
    // Now that we have a Facebook Session, we might want to store this new user in the db
    // Also, in this.params there is additional information about the user (name, pic, first_name, etc)
    // Note of warning: unlike the data in fbSession, this additional information has not been verified
    fbSession.first_name = this.params.post['first_name']
  }

  this.contentType('json')
  this.halt(200, JSON.stringify(fbSession || {}))
})

// Called on Facebook logout
app.post('/fbLogout', function() {
  this.fbLogout();
  this.halt(200, JSON.stringify({}))
})

// Static files in ./public
app.get('/xd_receiver.htm', function(file){ this.sendfile(__dirname + '/public/xd_receiver.htm') })
app.get('/javascripts/jquery.facebook.js', function(file){ this.sendfile(__dirname + '/public/javascripts/jquery.facebook.js') })




// app.get('/search', routes.search);



app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});



