var mongoose = require('mongoose')
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var User = new Schema({
    id              : ObjectId
  , facebook        : String
  , created         : {type: String, default: Date.now}
  , name            : {type: String}
  , email           : {type: String}
  , phone           : {type: String}
  , address         : {type: String}
  , city            : {type: String}
  , state           : {type: String}
  , zipcode         : {type: String}
  , picture         : String
  , password        : {type: String}
  , preferences     : [{type: String}]
  , notify          : [{type: String}]
  , bio             : {type: String}
  , photos          : [{type: String}]
})

var Event = new Schema({
    id        : ObjectId
  , title     : String
  , _creator   : { type: Schema.ObjectId, ref: 'User' }
  , created   : {type:String, default: Date.now}
  , date      : String
  , time      : String
  , city      : String
  , state     : String
  , status    : {type:String, default: "open"}
  , comment   : String
  , seats      : {type: Number, default: 1}
  , cost       : String
  , _guests    : [{ type: Schema.ObjectId, ref: 'User' }]
  , photos: [{type : String}]
});



mongoose.model("Event", Event);
mongoose.model("User", User);
