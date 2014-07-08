//test:  jasmine-node test/app-spec.js --autotest
var request = require('request');
var os = require('os');
var cookie;
var j = request.jar();
var request = request.defaults({jar: j});

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

    it("should return the register window", function(done){
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


  describe("login user", function(){

    it("should return login window", function(done){
      request.get(localhost+"/login", function(err,res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/Login/i);
        done();
      })
    })


    it("should NOT login the nonexisting user", function(done){
      var form = {
          email: 'test4sdf sfcsc@tesscdscft.test',
          password: "qwe12fgdsvfgdsgvdsvgdsv3qwe"
      }
      var options = {
        url : localhost+"/login",
        method: "POST",
        followAllRedirects: true,
        form: form
      }
      request(options, function(err,res){
        expect(res.statusCode).toBe(400);
        expect(res.body).toMatch(/can't find/i);
        done();
      })
    })


    it("should NOT login the existing user and bad password", function(done){
      var form = {
          email: 'test4@test.test',
          password: "qwe12fgdsvfgdsgvdsvgdsv3qwe"
      }
      var options = {
        url : localhost+"/login",
        method: "POST",
        followAllRedirects: true,
        form: form
      }
      request(options, function(err,res){
        expect(res.statusCode).toBe(400);
        expect(res.body).toMatch(/bad password/i);
        done();
      })
    })


    it("should login the existing user", function(done){
      var form = {
          email: 'test4@test.test',
          password: "qwe123qwe"
      }

      var options = {
        url : localhost+"/login",
        method: "POST",
        followAllRedirects: true,
        form: form
      }
      request(options, function(err,res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/session OK/i);
        cookie = j.getCookies(localhost+"/login");
        expect(cookie).toBeDefined();
        expect(cookie).toMatch(/logintoken/i);
        done();
      })
    })


    it("should stay logged in if after login was completed", function(done){
      request.get(localhost+'/users', function(err,res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/session OK/i);
        done();
      })
    })


    it("should recreate logintoken if logginin again when session already exists for current email", function(done){
      var token;
      //getting the existing logintoken
      request.get(localhost+'/users', function(err,res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/session OK/i);
        cookie = j.getCookies(localhost+"/login");
        token = cookie[1].value;
      })

      //login again
      var form = {
          email: 'test4@test.test',
          password: "qwe123qwe"
      }

      var options = {
        url : localhost+"/login",
        method: "POST",
        followAllRedirects: true,
        form: form
      }
      request(options, function(err,res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/session OK/i);
        cookie = j.getCookies(localhost+"/login");
        expect(cookie).toBeDefined();
        expect(cookie).toMatch(/logintoken/i);
        expect(token).not.toBe(cookie[1].value);
        done();
      })

    })



    it('should logout', function(done){
      request.get(localhost+'/logout', function(err, res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/login/i);
        cookie = j.getCookies(localhost+"/login");
        expect(cookie).toBeDefined();
        expect(cookie).not.toMatch(/logintoken/i);
        done();
      })
    })


    it("should stay logged OUT after logout was completed", function(done){
      request.get(localhost+'/users', function(err,res){
        expect(res.statusCode).toBe(200);
        expect(res.body).toMatch(/login/i);
        done();
      })
    })



  })



});