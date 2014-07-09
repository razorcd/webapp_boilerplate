
//process.env.NODE_ENV = 'production';
process.env.NODE_ENV = 'test';

 // Module dependencies.
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var methodOverride = require('method-override');
var flash = require("connect-flash");
var mongoose = require('mongoose');
var app = express();


//db
var db = require("./db/dbconnect.js")("WEBAPP-" + process.env.NODE_ENV);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser()); //{store:MongoStore(mongoStoreConnectionArgs)} ));
app.use(express.session( {
  //cookie: {maxAge: 1000},
  secret: 'webapp secret key here',
  //store: new MongoStore({ mongoose_connection: mongoose.connections[0] })
}));
app.use(flash());
app.use(methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// test only
if ('test' == app.get('env')) {
  app.use(express.errorHandler());

  //delete all users first
  var User = db.models.User || require('../db/model/User.js').User(db);
  User.find().remove().exec(function(){
    //execute jasmine tests in new process
    var exec = require('child_process').exec;
    var e = exec('jasmine-node test/app-spec.js --config APP_PORT ' + app.get('port'), function(err, stdout,stderr){
      console.log("\nJASMINE TEST RESULTS:");
      if(err) console.log(err)
      if (stderr) console.log(stderr)
        else {console.log(stdout);}
    });
  });
};    

//base routes
app.get('/', routes.index);


//*** user routes ***
app.get('/register', user.register_get);
app.post('/register', user.register_post)
app.get('/login', user.login_get);
app.post('/login', user.login_post)
app.get('/logout', user.logout)
app.get('/redirect', user.redirect);
//*** user routes END ***


// *** test routes ****
app.get('/expirations',user.expirations );
app.get('/checkLoginSession', user.checkLogin, user.checkLoginSession);
// *** test routes END ****



//CREATE SERVER
http.createServer(app).listen(app.get('port'), function(){
  console.log(' ------------------- Express server listening on port ' + app.get('port') + ' -------------------');
  console.log("Process environment:", app.get('env'));
});
