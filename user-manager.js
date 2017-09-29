var config = require('./config');

var UserManager = function(){
  this.users = [];
  this.numUsers = 0;
  //this.king = 0;
};

UserManager.prototype.addUser = function(user) {
  this.users.push(user);
  this.numUsers++;
};

UserManager.prototype.getUserIndex = function (user) {

  return this.users.findIndex(x => x.id == user.id);
}

UserManager.prototype.removeUser = function (user) {

  var index = this.getUserIndex(user);
  this.users.splice(index, 1);
  this.numUsers--;
};

UserManager.prototype.clearUsers = function() {
  this.users = {};
};

UserManager.prototype.battle = function(user, otherUser) {
  if (user.score > otherUser.score) {
    otherUser.killed = true;
    user.score += otherUser.score;
    otherUser.score = 0;
  }
};

UserManager.prototype.resetUser = function() {

};

module.exports.UserManager = UserManager;
