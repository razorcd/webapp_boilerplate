
module.exports = function(mongoose, dbName){
  var dbconn = mongoose.createConnection('localhost', dbName); 
  dbconn.on('error', function(err){
    console.log("Error on DB connection: ", err);
  });
  dbconn.once('open', function callback () {
    console.log("DB connection open ...");
  });
  return dbconn;
}
