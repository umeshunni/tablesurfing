
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

app.get('/', function (req, res) {
	// If there is a user, get that object, render a partial
	if(req.session.id){
		User.find({id: req.session.id}, function(err, user){
			res.renderPartial(__dirname + "/partials/header.jade", user)
		})
	}
	
	// Get 3 events for the data object
	Event.find({limit:3}, function(err, events){
	    res.render(__dirname + '/views/home.jade', events);
	})
}); 

app.get('/home', routes.index);

app.get('/user', routes.user);

app.get('/user/:id', routes.user);

app.get('/event', routes.createEvent)

app.get('/event/:eventid', routes.event);

app.get('/event/:eventid/confirm', routes.confirm);

app.get('/search', routes.search);



app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
