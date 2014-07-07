
module.exports = function(mongoose, dbName){
  var db = mongoose.connect('mongodb://localhost/' + dbName); 
  mongoose.connection.on('error', function(err){
    console.log("Error on DB connection: ", err);
  });
  mongoose.connection.once('open', function callback () {
    console.log("DB connection open ...");
  });
  return db;
}
