var uuid = require('uuid');
var SAT = require('sat');

var MAX_TRIALS = 10;

var cheese_DEFAULT_RADIUS = 10;
var cheese_DEFAULT_VALUE = 1;

var cheeseManager = function (options) {
  this.cellData = options.cellData;

  var cellBounds = options.cellBounds;
  this.cellBounds = cellBounds;
  this.cellX = cellBounds.minX;
  this.cellY = cellBounds.minY;
  this.cellWidth = cellBounds.maxX - cellBounds.minX;
  this.cellHeight = cellBounds.maxY - cellBounds.minY;

  this.playerNoDropRadius = options.playerNoDropRadius;
  this.cheeseMaxCount = options.cheeseMaxCount;
  this.cheeseDropInterval = options.cheeseDropInterval;

  this.cheeses = {};
  this.cheeseCount = 0;
};

cheeseManager.prototype.generateRandomAvailablePosition = function (cheeseRadius) {
  var cheeseDiameter = cheeseRadius * 2;
  var circles = [];

  var players = this.cellData.player;

  for (var i in players) {
    var curPlayer = players[i];
    circles.push(new SAT.Circle(new SAT.Vector(curPlayer.x, curPlayer.y), this.playerNoDropRadius));
  }

  var position = null;

  for (var j = 0; j < MAX_TRIALS; j++) {
    var tempPosition = {
      x: this.cellX + Math.round(Math.random() * (this.cellWidth - cheeseDiameter) + cheeseRadius),
      y: this.cellY + Math.round(Math.random() * (this.cellHeight - cheeseDiameter) + cheeseRadius)
    }

    var tempPoint = new SAT.Vector(tempPosition.x, tempPosition.y);

    var validPosition = true;
    for (var k = 0; k < circles.length; k++) {
      if (SAT.pointInCircle(tempPoint, circles[k])) {
        validPosition = false;
        break;
      }
    }
    if (validPosition) {
      position = tempPosition;
      break;
    }
  }
  return position;
};

cheeseManager.prototype.addcheese = function (value, subtype, radius) {
  radius = radius || cheese_DEFAULT_RADIUS;
  var cheeseId = uuid.v4();
  var validPosition = this.generateRandomAvailablePosition(radius);
  if (validPosition) {
    var cheese = {
      id: cheeseId,
      type: 'cheese',
      t: subtype || 1,
      v: value || cheese_DEFAULT_VALUE,
      r: radius,
      x: validPosition.x,
      y: validPosition.y
    };
    this.cheeses[cheeseId] = cheese;
    this.cheeseCount++;
    return cheese;
  }
  return null;
};

cheeseManager.prototype.removecheese = function (cheeseId) {
  var cheese = this.cheeses[cheeseId];
  if (cheese) {
    cheese.delete = 1;
    delete this.cheeses[cheeseId];
    this.cheeseCount--;
  }
};

cheeseManager.prototype.doesPlayerTouchcheese = function (cheeseId, player) {
  var cheese = this.cheeses[cheeseId];
  if (!cheese) {
    return false;
  }
  var playerCircle = new SAT.Circle(new SAT.Vector(player.x, player.y), Math.ceil(player.width / 2));
  var cheeseCircle = new SAT.Circle(new SAT.Vector(cheese.x, cheese.y), cheese.r);
  return SAT.testCircleCircle(playerCircle, cheeseCircle);
};

module.exports.cheeseManager = cheeseManager;
