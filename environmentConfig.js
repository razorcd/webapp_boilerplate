module.exports = function(db, env){// development only
  if ('production' == env) {
    return {
      sessionExpiration : 1000*60*60*24*7*2,   //2weeks for remember_me
      defaultExpiration : 1000*60*30, //30min for when remember_me expires
       lastTimeUsedExpiration : 1000*60*15 //15min for when lastTimeUsed expires
    }
  }

  // test only
  if ('test' == env) {
    return { 
      sessionExpiration : 1000*60,   //60s for remember_me
      defaultExpiration : 1000*25,   //25s for when remember_me expires (remmeber_me not checked)
      lastTimeUsedExpiration : 1000*10 //10s for when lastTimeUsed expires
    }
  }
}