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


  describe("login user and destroy session on expiration", function(){

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
        expect(cookie).not.toMatch(/Expires/);
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


  //TIME:0 - logging in without remember me
  describe("test user login - expirations", function() {
    
    it("should login the existing user", function(done){
      var form = {
          email: 'test4@test.test',
          password: "qwe123qwe"
          //remember_me: false
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
        console.log("\nLogged in at: ", new Date().toJSON());
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


    it("should have correct expirations", function(done) {
        request.get(localhost+'/expirations', function(err, res){
          var body = JSON.parse(res.body);
          console.log("\nSession: ",body);

          expect(body.remember_me).toBeDefined();
          expect(body.lastTimeUsed).toBeDefined();
          expect(body.createdAt).toBeDefined();

          expect((body.createdAt + 30000)).toBeGreaterThan(Date.now()); //createdAt max 30s ago
          expect(body.createdAt).toBeLessThan(Date.now()); //createdAt before now
          expect(body.lastTimeUsed+5000).toBeGreaterThan(Date.now()); //lastTimeUsed max 5s ago
          expect(body.lastTimeUsed).toBeLessThan(Date.now()); //lastTimeUsed before now

          expect(body.remember_me-30000).toBeLessThan(Date.now()); //remember_me until over 25s
          expect(body.remember_me-20000).toBeGreaterThan(Date.now()); //remember_me is bigger than now+20s
          
          done();
        })      
    });

    //TIME: 3s  -  updating lastTimeUsed
    it("should update lasttimeused and have same expiration after using for 3 second ", function(done) {
      
      setTimeout(function(){
        request.get(localhost+'/users', function(err,res){
          console.log("/users request after 3s, at: ", new Date().toJSON());
          request.get(localhost+'/expirations', function(err, res){
            var body = JSON.parse(res.body);
            
            expect(body.lastTimeUsed+5000).toBeGreaterThan(Date.now()); //lastTimeUsed max 5s ago
            expect(body.lastTimeUsed).toBeLessThan(Date.now()); //lastTimeUsed before now
            
            done();
          })
        })


      }, 3000);

    }, 5000);   //jasmine waits for 20s before error



    //TIME: 20s - updating lastTimeUsed, remember_me still not expired
    it("should update lastTimeUsed and have same expiration after using for 17 second ", function(done) {
      
      setTimeout(function(){
        request.get(localhost+'/users', function(err,res){
          console.log("/users request after 20s, at: ", new Date().toJSON());
          request.get(localhost+'/expirations', function(err, res){
            var body = JSON.parse(res.body);
            
            expect(body.lastTimeUsed+5000).toBeGreaterThan(Date.now()); //lastTimeUsed max 5s ago
            expect(body.lastTimeUsed).toBeLessThan(Date.now()); //lastTimeUsed before now
            
            done();
          })
        })


      }, 17000);

    }, 25000);   //jasmine waits for 25s before error


    //TIME: 27s  - remember_me should be expired but lastTimeUsed < 30s   |  still loggedin
    it("should update lastTimeUsed and have same expiration after using for another 7 second ", function(done) {
      
      setTimeout(function(){

        request.get(localhost+'/users', function(err,res){
          console.log("/users request after 27s, at: ", new Date().toJSON());
          expect(res.body).toMatch(/Session OK/i);  //still loggedin
          
          request.get(localhost+'/expirations', function(err, res){
            var body = JSON.parse(res.body);
            
            expect(body.remember_me).toBeLessThan(Date.now());
            expect(body.lastTimeUsed+5000).toBeGreaterThan(Date.now()); //lastTimeUsed max 5s ago
            expect(body.lastTimeUsed).toBeLessThan(Date.now()); //lastTimeUsed before now
            
            done();
          })
          
        })


      }, 7000);

    }, 10000);   //jasmine waits for 20s before error


    //TIME: 40s  - session should be expired and user logged out
    it("should be logged out and session should be destroyed after another 13s ", function(done) {
      
      setTimeout(function(){
        request.get(localhost+'/users', function(err,res){
          console.log("/users request after 40s, Session destroyed at: ", new Date().toJSON());
          expect(res.statusCode).toBe(200);
          expect(res.body).not.toMatch(/Session OK/i);

          //redirected to /login and deleted cookie.logintoken
          expect(res.statusCode).toBe(200);
          expect(res.body).toMatch(/login/i);
          cookie = j.getCookies(localhost+"/login");
          expect(cookie).toBeDefined();
          expect(cookie).not.toMatch(/logintoken/i);
          
          //session destroyed
          request.get(localhost+'/expirations', function(err, res){
            //var body = JSON.parse(res.body);
            expect(res.statusCode).not.toBe(200);
            expect(res.body).toMatch(/error/i);
            
            done();
          })

        })


      }, 13000);

    }, 20000);   //jasmine waits for 20s before error

  });
  


  describe("login with remember_me chacked", function() {

    it("should login the existing user", function(done){
      var form = {
          email: 'test4@test.test',
          password: "qwe123qwe",
          remember_me: true
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
        console.log("\nLogged in (with remember_me:true) at: ", new Date().toJSON());
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


    it("should have correct expirations when remember_me was checked", function(done) {
        request.get(localhost+'/expirations', function(err, res){
          var body = JSON.parse(res.body);
          console.log("\nSession: ",body);

          expect(body.remember_me).toBeDefined();
          expect(body.lastTimeUsed).toBeDefined();
          expect(body.createdAt).toBeDefined();

          expect((body.createdAt + 30000)).toBeGreaterThan(Date.now()); //createdAt max 30s ago
          expect(body.createdAt).toBeLessThan(Date.now()); //createdAt before now
          expect(body.lastTimeUsed+5000).toBeGreaterThan(Date.now()); //lastTimeUsed max 5s ago
          expect(body.lastTimeUsed).toBeLessThan(Date.now()); //lastTimeUsed before now

          expect(body.remember_me-60000*1-15000).toBeLessThan(Date.now()); //remember_me is smaller than now+1min15s
          expect(body.remember_me-45000).toBeGreaterThan(Date.now()); //remember_me is bigger than now+45s
          
          done();
        })      
    });
    

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


  });



});