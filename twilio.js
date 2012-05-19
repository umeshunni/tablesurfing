var https = require('https');

var accountSid = "AC7146821015cb43c737e13d8c4fa728e1";
var authToken = "9c8f7be596e297359c43c14d1dda9311";
var API_SERVER = 'api.twilio.com';
var API_VERSION = '2010-04-01';
var from = "+16464614722";

exports.sendText = function(to, body, cb){
    var postData = "To=" + to + "&From=" + from + "&Body=" + body;
	var options = {
        host: API_SERVER,
        port: 443,
        path: '/' + API_VERSION +"/Accounts/" + accountSid + "/SMS/Messages",
        method: 'POST',
        auth: accountSid + ':' + authToken,
        headers: {"Content-Type":"application/x-www-form-urlencoded",
					"Content-Length":postData.length}
	};

	var req = https.request(options, function(res) {

        res.on('data', function(d) {
            return cb(null, d);
        });
	});

	req.write(postData); // Write the body
	req.end();

	req.on('error', function(e) {
        console.error(e);
        return cb(e, null);
	});
	
};
