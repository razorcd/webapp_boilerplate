var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
  id: {type: String, get: function(){ return this._id.toHexString(); } },
  email: {type: String, unique: true, required:true, validate:[validateEmail, "Email not valid"]},
  password: {type: String, required: true, validate:[validatePass, "Password not valid. Must be min 8 characters"]}
});

//check password: cb(err, result), result=true is password is correct
userSchema.methods.authenticate = function(plainPassword, cb){
  bcrypt.compare(plainPassword, this.password, function(err, result){cb(err, result);})
};

//returns validation error as an object {email: 'some error', password: 'some other error'}
userSchema.methods.parseValidationError = function(){
  if (!this.errors) return;
  var error = {email: '', password: ''};
  if (this.errors.email) error.email = this.errors.email.message;
  if (this.errors.password) error.password = this.errors.password.message;
  //console.log(error);
  return error;
}

//encrypt password before saving to db
userSchema.pre('save', function(next){
  this.password = bcrypt.hashSync(this.password);
  next();
})


//validate email
function validateEmail(email){
  if (typeof email !== 'string') return false;
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

//validate password
function validatePass(pass){
  if (typeof pass !== 'string') return false;
  var re = /^[A-Za-z\d!@#$%^&*]{8,20}$/;
  return re.test(pass);
}

//User Model
exports.User = function(db){
  var Model = db.model('User', userSchema);
  return Model;
}