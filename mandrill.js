var https = require('https');

var HOST = "smtp.mandrillapp.com";
var PORT = 25;
var SMTP_USERNAME = "alex@bold-it.com";
var API_KEY = "9cac9ade-0541-42cf-80d8-bbcc48338bf7";
var FROM = "webmonkey@tablesurfing.org";

var API_SERVER = "mandrillapp.com"

exports.sendEmail = function(to, subject, html, tags, cb){
    // html, subject, from, to, tags
    var post = {
          key: API_KEY
        , message: {
              to: [
                 {email: to}
              ]
              , from: FROM
              , subject: subject
              , html: html
              , tags: tags
          }
    }
    var options = {
          host: API_SERVER
        , port: 443
        , path: "/api/1.0/messages/send.json"
        , method: 'POST'
        , headers: {"Content-Type":"application/json",
                    "Content-Length":post.length}
    };

    var req = https.request(options, function(res) {

        res.on('data', function(d) {
            return cb(null, d);
        });
    });
    req.write(JSON.stringify(post)); // Write the body
    req.end();

    req.on('error', function(e) {
        console.error(e);
        return cb(e, null);
    });
    
};
