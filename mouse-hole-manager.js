var config = require('./config');

var MouseHoleManager = function (options) {
  this.cellData = options.cellData;

  var cellBounds = options.cellBounds;
  this.cellBounds = cellBounds;
  this.cellX = cellBounds.minX;
  this.cellY = cellBounds.minY;
  this.cellWidth = cellBounds.maxX - cellBounds.minX;
  this.cellHeight = cellBounds.maxY - cellBounds.minY;

  this.mouseHoles = {};
  this.mouseHoleCount = 0;
}

MouseHoleManager.prototype.addMouseHole = function (player) {
  var mouseHoleId = uuid.v4();
  var mouseHole = {
    id: mouseHoleId,
    type: 'mouseHole',
    x: player.x,
    y: player.y
  };
  this.mouseHoles[mouseHoleId] = mouseHole;
  this.mouseHoleCount++;
  return mouseHole;
};

MouseHoleManager.prototype.removeMouseHole = function (mouseHoleId) {
  var mouseHole = this.mouseHoles[mouseHoleId];
  if (mouseHole) {
    mouseHole.delete = 1;
    delete this.mouseHoles[mouseHoleId];
    this.mouseHoleCount--;
  }
};

MouseHoleManager.prototype.doesPlayerTouchMouseHole = function (mouseHoleId, player) {
  var mouseHole = this.mouseHoles[mouseHoleId];
  if (!mouseHole) {
    return false;
  }
  var playerCircle = new SAT.Circle(new SAT.Vector(player.x, player.y), Math.ceil(player.width / 2));
  var mouseHoleCircle = new SAT.Circle(new SAT.Vector(mouseHole.x, mouseHole.y), mouseHole.r);
  return SAT.testCircleCircle(playerCircle, mouseHoleCircle);
};

module.exports.MouseHoleManager = MouseHoleManager;
