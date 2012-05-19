var mongoose = require('mongoose')
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var User = new Schema({
    id              : ObjectId
  , created         : {type: String, default: Date.now}
  , name            : {type: String}
  , email           : {type: String}
  , phone           : {type: String}
  , address         : {type: String}
  , city            : {type: String}
  , zipcode         : {type: String}
  , picture         : String
  , password        : {type: String}
  , preferences     : [{preference: String}]
})

var Event = new Schema({
    id        : ObjectId
  , title     : String
  , creator   : String
  , created   : {type:String, default: Date.now}
  , date      : String
  , notify    : [{method:String}]
  , status    : {type:String, default: "open"}
  , comment   : String
  , guests    : [{
          id       : String
        , name     : String
        , date     : {type:String, default: Date.now}
        , approval : {type:String, default:"pending"}
    }]
});



mongoose.model("Event", Event);
mongoose.model("User", User);
