var UserManager = function(userData){
  this.id = userData.id;
  this.type
  this.name = userData.name;
  this.score = userData.x;
  this.x = userData.x;
  this.y = userData.y;
}

UserManager.prototype.removeUser = function (User) {
  User.delete = 1;
};

module.exports.UserManager = UserManager;
