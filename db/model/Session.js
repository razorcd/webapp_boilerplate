var mongoose = require('mongoose');
//var jwt = require('jwt-simple');

var sessionSchema = mongoose.Schema({
  email: {type: String, unique: true, required:true},
  token: {type: String}
});


//generates token
sessionSchema.methods.generateToken = function(){
  var random = Math.round((new Date().valueOf() * Math.random())) + '';
  // var cookieSession = {
  //   email: this.email,
  //   token: random
  // }
  this.token = random;
  //this.token = jwt.encode(cookieSession, "secret webapp token pass");  
}


exports.Session = function(db){
  var model = db.model('Session', sessionSchema);
  return model;
}