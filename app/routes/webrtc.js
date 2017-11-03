var express = require('express');
var https= require('https');
// Constructor
function WebRtc(xirsys) {
    var router = express.Router();
    // check if method is defined in request
    router.use('/', function(req, res, next){
        var uri = req.url.split('?').shift();
        console.log(uri, req.params);
        if(req.params.method == null && uri.length<=1){
            req.error = {
                "s": "error",
                "v": "method_not_found"
            };
        }
        next();
    });
    // check if method is an allowed service
    router.use('/:method/', function(req, res, next){
        if(req.params.method != null){
            //console.log(xirsys['allowedServices'].indexOf('/'+req.params.method) , req.params.method);
            if (xirsys['allowedServices'].indexOf('/'+req.params.method) == -1) {
                req.error = {
                    "s": "error",
                    "v": "not_allowed"
                };
            }
        }
        next();
    });
    //check request for allowedClientSetChannel
    router.use('/:method/:channel',function (req, res, next){
        if(xirsys['overrideAllowedChannel'] == true && req.params.channel != null){
            xirsys.info.channel = req.params.channel;
        }
        next();
    });
    //apply channel to request/methods that require it only
    router.use(function (req, res, next) {
        var methods = ['/_token', '/_turn', '/_subs', '/_data', '/_acc'];
        var uri = req.url.split('?').shift();
        if(methods.indexOf(uri) != -1){
            var arr = req.url.split('?');
            req.url = arr[0] +"/"+ xirsys.info.channel;
            if(arr[1] != null ){
                req.url = req.url + "?" + arr[1];
            }
        }
        next();
    });
    //proxy request if no error is found
    router.use(function (req, res) {
        //if error from proxy and respond with error
        if(req.error){
            res.send(JSON.stringify(req.error));
        }
        //if error null proxy request to xirsys
        else {
            var options = {
                method: req.method,
                host: xirsys.gateway,
                path: req.url,
                headers: {
                    "Authorization": "Basic " + new Buffer(xirsys.info.ident+":"+xirsys.info.secret).toString("base64")
                }
            };
            //make call to Xirsys API, with modified request. Expect and return response to client.
            https.request(options, function(httpres) {
                var str = '';
                httpres.on('data', function(data){ str += data; });
                //error - returns 500 status and formatted response
                httpres.on('error', function(e){ console.log('error: ',e);
                    var o = {s:"error", v:"Proxy Request Error"};
                    res.status(500).send(JSON.stringify(o));
                });
                httpres.on('end', function(){
                    console.log("Requested: ",options.path,"\n : ",str);
                    res.send(str);
                });
            }).end();
        }
    });
    return router;
}
// export the class
module.exports = WebRtc;