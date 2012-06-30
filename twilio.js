var https = require('https');

var accountSid = "ACb26e0a7db2f04327b1133eab63012b0b";
var authToken = "778f875178eea976246ae5d5b42bc4c9";
var API_SERVER = 'api.twilio.com';
var API_VERSION = '2010-04-01';
var from = "+16264982253"; // manly table

exports.sendText = function(to, body, cb){
    var postData = "To=" + to + "&From=" + from + "&Body=" + body + "&cache=12345";
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
        	console.log(d)
        });
	});

	req.write(postData); // Write the body
	req.end();

	req.on('error', function(e) {
        console.error(e);
        return cb(e, null);
	});
	
};

exports.phoneUS = function(number){
	var regexObj = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

	if (regexObj.test(number)) {
	   return number.replace(regexObj, "+1$1$2$3");
	} else {
	    return number// Invalid phone number
	}
}