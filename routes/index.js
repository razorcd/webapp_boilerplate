
/*
 * GET home page.
 */

exports.index = function(req, res){
  var d = new Date();
  res.render('index', { date: d.toUTCString() });
};