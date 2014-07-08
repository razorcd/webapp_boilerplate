//test:  jasmine-node test/app-spec.js --autotest
var request = require('request');
var os = require('os');

var localhost = 'http://localhost:' + process.env.APP_PORT;
console.log("Running on: ", localhost);


describe("test User register/login/logout", function(){

  describe("test GET /", function() {

    it("should return status 200 ok /", function(done) {
      request.get(localhost, function(err,res){
        expect(res.statusCode).toBe(200);
        done();
      })
    });


    it("should redirect and then return status 200", function(done) {
      request.get(localhost+'/redirect', function(err,res){
        expect(res.statusCode).toBe(200);
        done();
      })
    });

  });


  describe("register user", function(){

    it("should return the login window", function(done){
      request.get(localhost+'/register', function(err,res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/class=\"registration\"/i)
        done();
      })
    })


    it("should return validation error on email format", function(done){
      var form = {
        email: 'r@r.r',
        password: 'qwertyuiop'
      }
      request.post(localhost+"/register", {form: form}, function(err,res){
        expect(res.statusCode).not.toBe(200);
        expect(res.body).toMatch(/Validation failed/i)
        done();
      })
    })


    it("should return validation error on email field missing", function(done){
      var form = {
        password: 'qwertyuiop'
      }
      request.post(localhost+"/register", {form: form}, function(err,res){
        expect(res.statusCode).not.toBe(200);
        expect(res.body).toMatch(/Validation failed/i)
        done();
      })
    })

    it("should return validation error on password format", function(done){
      var form = {
        email: 'qwer@ert@dd',
        password: 'qwe'
      }
      request.post(localhost+"/register", {form: form}, function(err,res){
        expect(res.statusCode).not.toBe(200);
        expect(res.body).toMatch(/Validation failed/i)
        done();
      })
    })


    it("should return validation error on password field missing", function(done){
      var form = {
        email: "qwert@qwe.ww"
      }
      request.post(localhost+"/register", {form: form}, function(err,res){
        expect(res.statusCode).not.toBe(200);
        expect(res.body).toMatch(/Validation failed/i)
        done();
      })
    })


    it("should create new user", function(done){
      var form = {
                email: 'test4@test.test',
                password: "qwe123qwe"
      }

      request.post(localhost+"/register", {form: form}, function(err,res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/test4@test.test/i);
        done();
      })
    })


    it("should return 400 on 'User already exists'", function(done){
      var form = {
                email: 'test4@test.test',
                password: "qwe123qwe"
      }
      request.post(localhost+"/register", {form: form}, function(err,res){
        expect(res.statusCode).not.toBe(200);
        expect(res.body).toMatch(/duplicate key error/i);
        done();
      })
    })

  })





});