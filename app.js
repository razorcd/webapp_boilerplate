process.env.NODE_ENV = 'test';

 // Module dependencies.
var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var methodOverride = require('method-override');
var mongoose = require('mongoose');
var jwt = require('jwt-simple');
var app = express();
var flash = require("connect-flash");

//db
var db = require("./db/dbconnect.js")(mongoose, "WEBAPP-" + process.env.NODE_ENV);
var User = require('./db/model/User.js').User(db);
var Session = require('./db/model/Session.js').Session(db);

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



// development only
if ('production' == app.get('env')) {
  var sessionExpiration = 1000*60*60*24*7*2;   //2weeks for remember_me
  var defaultExpiration = 1000*60*30; //30min for when remember_me expires
  var lastTimeUsedExpiration = 1000*60*15; //15min for when lastTimeUsed expires
}

// test only
if ('test' == app.get('env')) {
  var sessionExpiration = 1000*60;   //60s for remember_me
  var defaultExpiration = 1000*25   //25s for when remember_me expires (remmeber_me not checked)
  var lastTimeUsedExpiration = 1000*10; //10s for when lastTimeUsed expires

  //app.use(express.errorHandler());

  //delete all users first
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
}

app.get('/', routes.index);

app.get('/redirect', function(req,res){
  res.redirect('/');
})


//*** user routes ***
app.get('/register', function(req,res){
  
  var errorMessage = req.flash('loginErrorMessage')[0];
  if (errorMessage) res.render('user/register.jade', {emailErrorMessage: errorMessage.email, passwordErrorMessage: errorMessage.password});
  else res.render('user/register.jade');
})

app.post('/register', function(req,res){
    var userFields = {
      email : req.body.email,
      password : req.body.password
    } //validation here too ????

    var user = new User(userFields);

    user.save(function(err, savedUser){
      if (err) {

        //parsing the errors
        if (err.code && err.code === 11000) req.flash('loginErrorMessage',{email:"User already exists"});
        else {
          user.parseValidationError();
          req.flash('loginErrorMessage',user.parseValidationError());
        }

        res.redirect("/register");
        return;
      } else {
        //register successful
        login(userFields, req, res);
      }
    })
})

app.get('/login', function(req,res){
  var errorMessage = req.flash('loginErrorMessage')[0];
  if (errorMessage) res.render('user/login.jade', {emailErrorMessage: errorMessage.email, passwordErrorMessage: errorMessage.password});
  else res.render('user/login.jade');
})

app.post('/login', function(req,res){
  var userLogin = {     
    email: req.body.email,
    password: req.body.password
  };
  
  login(userLogin, req, res);
})


function login(userLogin, req, res, next){
  var remember_me = Date.now() + defaultExpiration;  //default expiration 30min

  User.findOne({email: userLogin.email}, function(err, user){
    if (err) {
      res.send(400, err); 
      return;
    }
    if (user) {
      user.authenticate(userLogin.password, function(err, result){
        if (err) {
          res.send(400,err);
          return;
        }
        if(result === true) {
          //find if an old session already exists for this email
          if (req.body.remember_me) remember_me = Date.now() + sessionExpiration;    //stored session expiration date
          Session.findOne({email: user.email}, function(err, oldUser){
            //generating new session token
            var session = oldUser || new Session( {createdAt: Date.now(), email: user.email, remember_me: remember_me});
            session.generateToken();
            session.remember_me = remember_me;            
            session.save(function(err,token){
              if (err) { res.send(400,err); return;}
              //adding encoded token to cookie
              var decCookieToken = {
                  email: session.email,
                  token: session.token
              }
              var encodedCookieToken = jwt.encode(decCookieToken, "secret webapp token pass");
              //if (req.body.remember_me)  res.cookie('logintoken', encodedCookieToken, { expires: new Date(Date.now() + sessionExpiration), path: '/' }) //15s
                //res.cookie('logintoken', encodedCookieToken, { expires: new Date(Date.now() + 2 * 604800000), path: '/' }) //2*7days
              ///else  
              res.cookie('logintoken', encodedCookieToken, {path: '/'} ) 
              res.redirect("/checkLoginSession");
            })
          });

        }
        else {
          //bad password
          req.flash('loginErrorMessage',{password:"Bad password"});
          res.redirect('/login');
          return;
        }
      })
    } else { 
      //can't find email
      req.flash('loginErrorMessage',{email:"Can't find email"});
      res.redirect("/login");
    };
  })
}


function checkLogin(req,res,next){
  if(req.cookies && req.cookies.logintoken){
    var decCookieSession = jwt.decode(req.cookies.logintoken, "secret webapp token pass");
    Session.findOne({email: decCookieSession.email}, function(err, session){
      if (session && decCookieSession.token === session.token) {
        
        //check if session expired. If remember_me expired and lastTimeUsed was 10min ago then delete session.
        if ((session.remember_me < Date.now()) && ((Date.now() - session.lastTimeUsed))>lastTimeUsedExpiration) { //lasttimeused more then 10min ago
          console.log("Session expired for " + session.email);
          session.remove();
          res.clearCookie('logintoken');
          res.redirect('/login');
          return;
        }
                                          
        req.currentUser = session.email;
        session.setLastTimeUsed(); session.save();  //updating sesions lastTimeUsed value
        next();
      }
      else {
        res.clearCookie('logintoken');
        res.redirect('/login');
      }
    })

  } else res.redirect('/login');
}



app.get('/logout', function(req,res){
  if(req.cookies && req.cookies.logintoken){
    var decCookieToken = jwt.decode(req.cookies.logintoken, "secret webapp token pass");
    Session.remove({email: decCookieToken.email}, function(err, affectedDocs){
      if (err) { res.send(400, err); return;}
      res.clearCookie('logintoken');
      req.session.destroy( function() {});
      res.redirect('/login');
    })
  } else res.send(400, 'error logging out');
})

//*** user routes END ***


// *** test routes ****
app.get('/expirations', function(req,res){
  if(req.cookies && req.cookies.logintoken){
   var decCookieToken = jwt.decode(req.cookies.logintoken, "secret webapp token pass");
   Session.findOne({email: decCookieToken.email}, function(err, ses){
    if (err){
      res.send("error finding session");
      return;
    }
    res.send({
      remember_me : Date.parse(ses.remember_me),
      lastTimeUsed: Date.parse(ses.lastTimeUsed) ,
      createdAt: Date.parse(ses.createdAt) 
    })
   })
  } else res.send(400,"error: missing logintoken cookie");
})

app.get('/checkLoginSession', checkLogin, function(req,res){
  res.render('user/checkLoginSession.jade', {currentUser: req.currentUser});
});
// *** test routes END ****

http.createServer(app).listen(app.get('port'), function(){
  console.log(' ------------------- Express server listening on port ' + app.get('port') + ' -------------------');
  console.log("Process environment:", app.get('env'));
});
