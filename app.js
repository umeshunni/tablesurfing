
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , mongoose = require('mongoose')
  , twilio = require('./twilio');


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
	res.send("<Request><Sms>Thank you for texting!</Sms></Request>")
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
		if(err) res.send(err)
	    res.render(__dirname + '/views/home.jade', {title: "home", events: events});
	})
	
});

app.get('/user', function (req, res) {
	// If logged in, profile
	if(req.session && req.session.id){
		User.findOne({id: req.session.id}, function(err, user){
			if (user) {
				res.render(__dirname + '/views/user.jade', {title: "user", user: user});
			} else {
				res.send(err)
			}
		})
	}
	else{
		res.render(__dirname + '/views/signup.jade', {title: "signup"});
	}	
})

app.get('/user/:id', function (req, res) {
	var id = req.params.id;
	// If logged in, profile
	User.findOne({id: id}, function(err, user){
		if(user)
			res.render(__dirname + '/views/user.jade', {title: "user/:id", user: user});
		else
			res.send(err)
	})
})


app.get('/event', function (req, res) {
	var limit = 10
	Event.find().limit(5).exec(function(err, events){
	    res.render(__dirname + '/views/eventlist.jade', {title: "eventlist", events: events, page: 1, limit: limit});
	})
})

// app.post('/event', function (req, res) // Take skip and limit variables, return list

app.get('/event/:id', function (req, res) {
	var id = req.params.id;
	// If logged in, profile
	Event.findOne({id: id}, function(err, event){
		if(event)
			res.render(__dirname + '/views/event.jade', {title: "event/:id", event: event});
		else
			res.send(err)
	})
})

// app.get('/event/:eventid/confirm', routes.confirm);
app.post('/event/:id/confirm', function (req, res) {
	// Assume agreed to requirements
	var id = req.params.id;
	if(req.session && req.session.id){
		// If logged in, profile
		Event.findOne({id: id}, function(err, event){
			if(err) res.send(err)
			User.findOne({id: req.session.id}, function(err, user){
				if(err) res.send(err)
				event.guests.add({id: user.id, name: user.name}, function(err, res){
					if(err) res.send(err)
					// Notify the host through their method
					User.findOne({id: event.creator}, function(err, host){
						if(host.notify.indexOf("sms") != -1)
							twilio.sendText(host.phone, user.name + " has asked to join your event " + event.title)
						if(host.notify.indexOf("email") != -1)
							console.log("Remember to drink your Ovaltine"); // Send an email to the host
					})
					res.render(__dirname + '/views/confirm.jade', {title: ":id/confirm", result: res});
				})
			})
		})
	} else {
		res.render(__dirname + '/views/signup.jade', {title: "signup"});
	}
})


// app.get('/search', routes.search);



app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
