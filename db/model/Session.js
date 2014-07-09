var mongoose = require('mongoose');

var sessionSchema = mongoose.Schema({
  email: {type: String, unique: true, required:true},
  token: {type: String},
  remember_me: {type: Date}, //default expiraton 30min
  lastTimeUsed: {type: Date, default: Date.now()}, //if ( lasttimeused > 30min and expire<Date.now() )  delete doc
  createdAt: {type: Date, default: Date.now()}
});

//set lastTimeUsed to now
sessionSchema.methods.setLastTimeUsed = function(){
  this.lastTimeUsed = Date.now();
}

//generates token
sessionSchema.methods.generateToken = function(){
  var random = Math.round((new Date().valueOf() * Math.random())) + '';
  this.token = random;
  //this.token = jwt.encode(cookieSession, "secret webapp token pass");  
}


exports.Session = function(db){
  var model = db.model('Session', sessionSchema);
  return model;
}