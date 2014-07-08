//test:  jasmine-node test/app-spec.js --autotest
var request = require('request');
var os = require('os');

console.log(process.env.APP_PORT);
var localhost = 'http://localhost:' + process.env.APP_PORT;

describe("1st test", function() {

  it("should pass", function(done) {
    request.get(localhost, function(err,res){
      
      expect(res.statusCode).toBe(200);
      done();

    })
    
  });


  it("should pass 2", function(done) {
    request.get(localhost+'/redirect', function(err,res){
      
      expect(res.statusCode).toBe(200);
      done();

    })
    
  });

});