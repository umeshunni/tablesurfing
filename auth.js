var everyauth = require('everyauth');
var mongoose = require('mongoose');
var User = mongoose.model('User');

module.exports.configure = function (app) {

everyauth.debug = true;

// everyauth.everymodule.findUserById( function(id,callback){
// debugger;
// callback(null, usersById[id]);
// }); 

everyauth.facebook
.appId('217422248376051')
.appSecret('b9723de2871ddcd41b07ffe5a97e7f6a')
.findOrCreateUser( function(session, accessToken, accessTokenExtra, fbUserMetadata){
var id = fbUserMetadata.id;
var promise = this.Promise();
User.findOne({ facebookId: id}, function(err, result) {
var user;
if(!result) {
user = new User();
user.facebook = id;
user.name = fbUserMetadata.name;
user.save();
} else {
user = result.doc;
}
promise.fulfill(user);
});
return promise;
})
.redirectPath('/');

// mixin view helpers for everyauth
everyauth.helpExpress(app);

return everyauth.middleware();
};