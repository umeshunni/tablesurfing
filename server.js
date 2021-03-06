
/**
 * Module dependencies.
 */
var port = process.env.PORT || 3000

var express = require('express')
  , routes = require('./routes')
  , mongoose = require('mongoose')
  , twilio = require('./twilio')
  , everyauth = require('everyauth')
  , config = require('./config');



//mongoose.connect("mongo://localhost/tablesurfing"); // Old and busted
//mongoose.connect("mongodb://nodeuser:oompabeard@staff.mongohq.com:10066/tablesurfing"); // New hotness
mongoose.connect("mongodb://nodeuser:sUperm4rio@placematvm.cloudapp.net:27017/tablesurfing"); // And the newest
require('./models.js');
var User = mongoose.model("User", User);
var Event = mongoose.model("Event", Event);

everyauth.everymodule.userPkey('_id');
everyauth.everymodule
    .findUserById( function (id, callback) {
        User.findById(id, callback)
    });

// tablesurfing.org domain
// .appId('217422248376051')
// .appSecret('b9723de2871ddcd41b07ffe5a97e7f6a')
// localhost
// .appId('419312468089420')
// .appSecret('6f1c51f6ea13cf58c9f42d1c1feb2bac')
// azure
// .appId('258022404298399')
// .appSecret('16d903518f272e53cff4949748abe7d2')

everyauth.facebook
.appId('258022404298399')
.appSecret('16d903518f272e53cff4949748abe7d2')
.fields('id,name,email,picture,location')
.findOrCreateUser( function (session, accessToken, accessTokenExtra, userMetadata){
    var id = userMetadata.id;
    var promise = this.Promise();
    User.findOne({ facebook: id}, function(err, result) {
        var user;
        if(!result) {
            user = new User();
            user.facebook = id;
            user.name = userMetadata.name;
            user.picture = userMetadata.picture;
            user.email = userMetadata.email;
            user.save();
        } else {
            user = result;
        }
        promise.fulfill(user);
    });
    return promise;
} )
.redirectPath('/last');

everyauth.twitter
  .consumerKey('uA06yZhNfwHv7ntaK9YAg')
  .consumerSecret('rKezWLcbf1ysQ889phi12xCNft9yOmjKOVM8o4Xi24')
  .findOrCreateUser( function (session, accessToken, accessTokenExtra, userMetadata){
    var id = userMetadata.id;
    var promise = this.Promise();
    User.findOne({ twitter: id}, function(err, result) {
        var user;
        if(!result) {
            user = new User();
            user.twitter = id;
            user.name = userMetadata.name;
            user.picture = userMetadata.profile_image_url;
            user.save();
        } else {
            user = result;
        }
        promise.fulfill(user);
    });
    return promise;
} )
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
app.post('/event/:eventId/guest/:guestId/:approval', ensureAuthenticated, event.post_id_guest)

app.get('/events', event.list)


app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

function ensureAuthenticated(req, res, next) {
    var auth = req.session.auth
    if ( auth && auth.loggedIn ) { 
        if(!req.user.email && req.route.path != '/user'){
            res.redirect('/user?missing=email')
        }
        else{
            return next(); 
        }
    }
    else{
        req.session.return_path = req.url
        res.redirect('/login');
    }
}

