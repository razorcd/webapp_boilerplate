//dependencies
var mongoose = require('mongoose');
var jwt = require('jwt-simple');
var flash = require("connect-flash");

//db
var db = require("../db/dbconnect.js")("WEBAPP-" + process.env.NODE_ENV);
var User = db.models.User || require('../db/model/User.js').User(db);
var Session = db.models.Session || require('../db/model/Session.js').Session(db);

//environment expiration variables
var envExpVariables = require('../environmentConfig.js')(db, process.env.NODE_ENV);


// *** ROUTES FUNCTION ***
exports.list = function(req, res){
  res.send("respond with a resource");
};

//app.get('/register')
exports.register_get = function(req,res){
  var errorMessage = req.flash('loginErrorMessage')[0];
  if (errorMessage) res.render('user/register.jade', {emailErrorMessage: errorMessage.email, passwordErrorMessage: errorMessage.password});
  else res.render('user/register.jade');
}

//app.post('/register')
exports.register_post = function(req,res){
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
        exports.login(userFields, req, res);
      }
    })
}

//app.get('/checkLoginSession' checklogin)
exports.checkLoginSession = function(req,res){
  res.render('user/checkLoginSession.jade', {currentUser: req.currentUser});
}

//app.get('/expirations', checklogin)
exports.expirations = function(req,res){
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
}

//app.get('/login')
exports.login_get = function(req,res){
  var errorMessage = req.flash('loginErrorMessage')[0];
  if (errorMessage) res.render('user/login.jade', {emailErrorMessage: errorMessage.email, passwordErrorMessage: errorMessage.password});
  else res.render('user/login.jade');
}

//app.post('/login')
 exports.login_post = function(req,res){
  var userLogin = {     
    email: req.body.email,
    password: req.body.password
  };
  exports.login(userLogin, req, res);
}

//app.get('/logout')
exports.logout = function(req,res){
  if(req.cookies && req.cookies.logintoken){
    var decCookieToken = jwt.decode(req.cookies.logintoken, "secret webapp token pass");
    Session.remove({email: decCookieToken.email}, function(err, affectedDocs){
      if (err) { res.send(400, err); return;}
      res.clearCookie('logintoken');
      req.session.destroy( function() {});
      res.redirect('/login');
    })
  } else res.send(400, 'error logging out');
}

//app.get('/redirect')
exports.redirect = function(req,res){
  res.redirect('/');
}

// *** ROUTES FUNCTION END ***



//check if user is logged in middleware
exports.checkLogin = function(req,res,next){
  if(req.cookies && req.cookies.logintoken){
    var decCookieSession = jwt.decode(req.cookies.logintoken, "secret webapp token pass");
    Session.findOne({email: decCookieSession.email}, function(err, session){
      if (session && decCookieSession.token === session.token) {
        
        //check if session expired. If remember_me expired and lastTimeUsed was 10min ago then delete session.
        if ((session.remember_me < Date.now()) && ((Date.now() - session.lastTimeUsed))>envExpVariables.lastTimeUsedExpiration) { //lasttimeused more then 10min ago
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


//logs in an user
exports.login = function(userLogin, req, res, next){
  var remember_me = Date.now() + envExpVariables.defaultExpiration;  //default expiration 30min

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
          if (req.body.remember_me) remember_me = Date.now() + envExpVariables.sessionExpiration;    //stored session expiration date
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