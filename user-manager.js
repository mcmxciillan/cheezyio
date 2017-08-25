var config = require('./config');

var UserManager = function(options){
  this.users = {};
  this.numUsers = 0;
};

// UserManager.prototype.resetUser = function (user) {
//   user.score = 0;
//   user.x = Math.random() * config.WORLD_WIDTH;
//   user.y = Math.random() * config.WORLD_HEIGHT;
//   console.log("User spawned at X: " + user.x + " Y: " + user.y );
//   user.killed = false;
// };

UserManager.prototype.addUser = function(user) {
  this.users.push(user);
  this.numUsers++;
};

UserManager.prototype.removeUser = function (user) {
  var index = this.users.findIndex(x => x.id == user.id);
  this.users.splice(index, 1);
  this.numUsers--;
};

UserManager.prototype.attackUser = function(user, killedUser) {

    killedUser.killed = true;
    user.score += killedUser.score;
    console.log("Victim " + killedUser.name + " is killed: " + killedUser.killed);
    console.log("Winner is " + user.name + " Killed?: " + user.killed);
    //this.resetUser(killedUser);
    return killedUser;
};

UserManager.prototype.resetUser = function() {

};

// UserManager.prototype.resetUser = function (user) {
//   user.reset = 1;
// };

module.exports.UserManager = UserManager;
