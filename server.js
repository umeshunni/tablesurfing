
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

var site = require('./routes/site')
  , user = require('./routes/user')
  , event = require('./routes/event')


// ****** Root ******
app.get('/', site.index )
app.get('/home', site.home)
app.get('/last', site.last)
app.get('/login', site.login)
app.get('/about', site.about)
app.get('/contact', site.contact)




// ****** User ******
app.get('/user/:id', user.view)
app.get('/user', ensureAuthenticated, user.get)
app.post('/user', ensureAuthenticated, user.update)

// ****** Event ******
app.get('/event', ensureAuthenticated, event.get)
app.post('/event', ensureAuthenticated, event.post)
app.get('/event/:id', event.get_id)
app.post('/event/:id', event.post_id)
app.get('/event/:id/join', ensureAuthenticated, event.join)
app.post('/event/:id/guest', ensureAuthenticated, event.post_id_guest)

app.get('/events', event.list)


app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

function ensureAuthenticated(req, res, next) {
    var auth = req.session.auth
    req.session.return_path = req.url
    if ( auth && auth.loggedIn ) { 
        User.findOne({"facebook": auth.facebook.user.id}, function(err, account){
            req.session.account = account
            return next(); 
        })
    }
    else{
        res.redirect('/login');
    }
}

