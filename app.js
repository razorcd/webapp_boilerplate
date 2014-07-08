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
app.use(methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));



// development only
if ('production' == app.get('env')) {
  var sessionExpiration = 1000*60*60*24*7*2;   //2weeks for remember_me
}

// test only
if ('test' == app.get('env')) {
  var sessionExpiration = 5000*60;   //5min for remember_me
  app.use(express.errorHandler());
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
app.get('/testlogin', checkLogin, function(req,res){
  res.render('user/testLogin.jade', {currentUser: req.currentUser});
})
app.get('/users', checkLogin, function(req,res){
  res.send('session OK')
});
app.get('/redirect', function(req,res){
  res.redirect('/');
})


//*** user routes ***
app.get('/register', function(req,res){
  res.render('user/register.jade');
})

app.post('/register', function(req,res){
    var userFields = {
      email : req.body.email,
      password : req.body.password
    }

    var user = new User(userFields);

    user.save(function(err, savedUser){
      if (err) {
        res.send(400, err);
        return;
      }
      res.send(savedUser);
      //res.redirect('/inside');
    })
})

app.get('/login', function(req,res){
  res.render('user/login.jade', {  /*, messages: req.flash('login')*/ });
})

app.post('/login', function(req,res){
  var user = {     email: req.body.email,  };
  var remember_me = Date.now() + 1000*60*10;  //default expiration 30min

  User.findOne(user, function(err, user){
    if (err) {res.send(400, err); return;}
    if (user) {
      user.authenticate(req.body.password, function(err, result){
        if (err) {res.send(400, err); return;}
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
              res.cookie('logintoken', encodedCookieToken, {path: '/'} ) //2*7days
              //res.send(token);
              res.redirect("/users");
            })
          });

        }
        else res.send(400,"bad password");
      })
    } else { res.send(400, "can't find email")};
  })
})



function checkLogin(req,res,next){
  if(req.cookies && req.cookies.logintoken){
    var decCookieSession = jwt.decode(req.cookies.logintoken, "secret webapp token pass");
    Session.findOne({email: decCookieSession.email}, function(err, session){
      if (session && decCookieSession.token === session.token) {
        
        //check if session expired. If remember_me expired and lastTimeUsed was 10min ago then delete session.
        if ((session.remember_me < Date.now()) && ((Date.now() - session.lastTimeUsed)/1000)>10*60) { //lasttimeused more then 10min ago
          console.log("Session expired");
          session.remove();
          res.clearCookie('logintoken');
          res.redirect('/login');
          return;
        }
        //console.log("Session alive");
        //console.log("Remaining until remember_me: ", (session.remember_me - Date.now())/1000/60 + "min until expiration"); 
        //console.log("Lasttimeused: ", (Date.now() - session.lastTimeUsed)/1000 + "s ago"); 
        //console.log(req.cookies);
        //if (req.cookies.logintoken) res.cookie('logintoken', req.cookies.logintoken, { expires: new Date(Date.now() + sessionExpiration), path: '/' }) //reset cookie expiratin to another 10min
                                          
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



http.createServer(app).listen(app.get('port'), function(){
  console.log(' ------------------- Express server listening on port ' + app.get('port') + ' -------------------');
  console.log("Process environment:", app.get('env'));
});
