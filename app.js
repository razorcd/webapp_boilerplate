process.env.NODE_ENV = 'test';

/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var methodOverride = require('method-override');
var formidable = require('formidable');
var mongoose = require('mongoose');
var app = exports.app = express();

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
app.use(methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

//db
var db = require("./db/dbconnect.js")(mongoose, "WEBAPP" + process.env.NODE_ENV);
var User = require('./db/model/User.js').User(db);



// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// test only
if ('test' == app.get('env')) {
  var exec = require('child_process').exec;
  var e = exec('jasmine-node test/app-spec.js --config APP_PORT ' + app.get('port') + ' --config APP_HOST ' + app.get('host'), function(err, stdout,stderr){
    console.log(" ****** JASMINE TEST RESULTS: *******");
    if(err) console.log(err)
    if (stderr) console.log(stderr)
      else {console.log(stdout);}
    console.log(" ****** JASMINE TEST RESULTS. *******");
  });
}

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/redirect', function(req,res){
  res.redirect('/');
})


//user routes
app.get('/register', function(req,res){
  res.render('user/register.jade');
})

app.post('/register', function(req,res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    if (err) {
      res.send(400, err);
      return;
    }

    var userFields = {
      email : fields.email,
      password : fields.password
    }

    var user = new User(userFields);

    user.save(function(err, savedUser){
      if (err) {
        res.send(400, err);
        return;
      }
      req.session.user_id = savedUser.id;
      res.send(savedUser);
      //res.redirect('/inside');
    })

    
  })
})








http.createServer(app).listen(app.get('port'), function(){
  console.log(' ------------------- Express server listening on port ' + app.get('port') + ' -------------------');
  console.log("Process environment:", app.get('env'));
});
