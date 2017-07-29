var config = require('./config');

var UserManager = function(userData){
  this.id = userData.id;
  this.type
  this.name = userData.name;
  this.score = userData.x;
  this.x = userData.x;
  this.y = userData.y;
  this.killed = false;
};

// UserManager.prototype.resetUser = function (user) {
//   user.score = 0;
//   user.x = Math.random() * config.WORLD_WIDTH;
//   user.y = Math.random() * config.WORLD_HEIGHT;
//   //console.log("User spawned at X: " + user.x + " Y: " + user.y );
// };

UserManager.prototype.addPoints = function(user, killedUser) {
  killedUser.killed = true;
  user.score += killedUser.score;
  //console.log("Added " + killedUser.score + " to your score.");
  killedUser.score = 0;
};

module.exports.UserManager = UserManager;
