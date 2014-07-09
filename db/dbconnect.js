var mongoose = require('mongoose');
var env = process.env.NODE_ENV;


//creates a db connection
function createDbConnection(dbName){
  var dbconnection;
  if (env === 'production') dbconnection = mongoose.createConnection('localhost', dbName); 
  if (env === 'test') dbconnection = mongoose.createConnection('localhost', dbName); 
  
  dbconnection.on('error', function(err){
    console.log("Error on DB connection: ", err);
  });
  dbconnection.once('open', function callback () {
    console.log("DB connection open ...");
  });

  return dbconnection;
}


module.exports = function(dbName){
  //find if connection already exists (by name)
  var connection;
  mongoose.connections.forEach(function(c){
    if (c.name === dbName) connection = c;
  })
  //return found connection or create new connection
  return connection || createDbConnection(dbName);
}

