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

UserManager.prototype.attackUser = function(user, killedUser) {

    killedUser.killed = true;
    user.score += killedUser.score;
    killedUser.score = 0;
    console.log("Victim " + killedUser.name + " is killed: " + killedUser.killed);
    console.log("Winner is " + user.name + " Killed?: " + user.killed);
    killedUser.delete = 1;
};

// UserManager.prototype.resetUser = function (user) {
//   user.reset = 1;
// };

module.exports.UserManager = UserManager;
