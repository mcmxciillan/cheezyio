

  //var cellController = require('./cell').CellController;


    //  Note that this html file is set to pull down Phaser from our public/ directory.
    //  Although it will work fine with this tutorial, it's almost certainly not the most current version.
    //  Be sure to replace it with an updated version before you start experimenting with adding your own code.
var playState = {

  socket: socketCluster.connect({
      codecEngine: scCodecMinBin
    }),

    channelGrid: "",

    WORLD_WIDTH: "",
    WORLD_HEIGHT: "",
    WORLD_COLS: "",
    WORLD_ROWS: "",
    WORLD_CELL_WIDTH: "",
    WORLD_CELL_HEIGHT: "",
    PLAYER_LINE_OF_SIGHT: Math.round(window.innerWidth),
    PLAYER_INACTIVITY_TIMEOUT: 700,
    USER_INPUT_INTERVAL: 20,
    COIN_INACTIVITY_TIMEOUT: 2200,
    ENVIRONMENT: "",
    SERVER_WORKER_ID: "",
    //game: require('./game'),

preload : function() {

    var playerId, player;
    users = {};
    coins = {};



    var youTextures = {
      up: 'img/you-back.gif',
      left: 'img/you-side-left.gif',
      right: 'img/you-side-right.gif',
      down: 'img/you-front.gif'
    };

    var othersTextures = {
      up: 'img/others-back.gif',
      left: 'img/others-side-left.gif',
      right: 'img/others-side-right.gif',
      down: 'img/others-front.gif'
    };

    var botTextures = {
      up: 'img/bot-back.gif',
      left: 'img/bot-side-left.gif',
      right: 'img/bot-side-right.gif',
      down: 'img/bot-front.gif'
    };

    // Map the score value to the texture.
    var grassTextures = {
      1: 'img/grass-1.gif',
      2: 'img/grass-2.gif',
      3: 'img/grass-3.gif',
      4: 'img/grass-4.gif'
    };

    // 1 means no smoothing. 0.1 is quite smooth.
    var CAMERA_SMOOTHING = .1;
    var BACKGROUND_TEXTURE = '../img/background-texture.png';

    playState.socket.emit('getWorldInfo', function (err, data) {
      this.WORLD_WIDTH = data.width;
      this.WORLD_HEIGHT = data.height;
      this.WORLD_COLS = data.cols;
      this.WORLD_ROWS = data.rows;
      this.WORLD_CELL_WIDTH = data.cellWidth;
      this.WORLD_CELL_HEIGHT = data.cellHeight;
      this.WORLD_CELL_OVERLAP_DISTANCE = data.cellOverlapDistance;
      this.SERVER_WORKER_ID = data.serverWorkerId;
      this.ENVIRONMENT = data.environment;

      channelGrid = new ChannelGrid({
        worldWidth: this.WORLD_WIDTH,
        worldHeight: this.WORLD_HEIGHT,
        rows: this.WORLD_ROWS,
        cols: this.WORLD_COLS,
        cellOverlapDistance: this.WORLD_CELL_OVERLAP_DISTANCE,
        exchange: playState.socket
      });

      game = new Phaser.Game('100', '100', Phaser.AUTO, '', {
        preload: playState.preload,
        create: playState.create,
        render: playState.render,
        update: playState.update
      });
      // game.preload = this.preload;
      // game.create = this.create;
      // game.render = this.render;
      // game.update = this.update;

      game.state.add('play', playState);
    });


      keys = {
        up: game.input.keyboard.addKey(Phaser.Keyboard.UP),
        down: game.input.keyboard.addKey(Phaser.Keyboard.DOWN),
        right: game.input.keyboard.addKey(Phaser.Keyboard.RIGHT),
        left: game.input.keyboard.addKey(Phaser.Keyboard.LEFT),
        space: game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR)
      };

      game.load.image('background', BACKGROUND_TEXTURE);

      game.load.image('you-up', youTextures.up);
      game.load.image('you-down', youTextures.down);
      game.load.image('you-right', youTextures.right);
      game.load.image('you-left', youTextures.left);

      game.load.image('others-up', othersTextures.up);
      game.load.image('others-down', othersTextures.down);
      game.load.image('others-right', othersTextures.right);
      game.load.image('others-left', othersTextures.left);

      game.load.image('bot-up', botTextures.up);
      game.load.image('bot-down', botTextures.down);
      game.load.image('bot-right', botTextures.right);
      game.load.image('bot-left', botTextures.left);

      game.load.image('grass-1', grassTextures[1]);
      game.load.image('grass-2', grassTextures[2]);
      game.load.image('grass-3', grassTextures[3]);
      game.load.image('grass-4', grassTextures[4]);
    },

    handleCellData: function (stateList) {
      stateList.forEach(function (state) {
        if (state.type == 'player') {
          updateUser(state);
        } else if (state.type == 'coin') {
          if (state.delete) {
            removeCoin(state);
          } else {
            renderCoin(state);
          }
        }
      });
      updatePlayerZIndexes();
    },

    watchingCells: {},

    /*
      Data channels within our game are divided a grids and we only watch the cells
      which are within our player's line of sight.
      As the player moves around the game world, we need to keep updating the cell subscriptions.
    */
    updateCellWatchers: function(playerData, channelName, handler) {
      var options = {
        lineOfSight: this.PLAYER_LINE_OF_SIGHT
      };
      this.channelGrid.updateCellWatchers(playerData, channelName, options, handler);
    },

    updateUserGraphics: function(user) {
      user.sprite.x = user.x;
      user.sprite.y = user.y;

      if (!user.direction) {
        user.direction = 'down';
      }
      user.sprite.loadTexture(user.texturePrefix + '-' + user.direction);

      user.label.alignTo(user.sprite, Phaser.BOTTOM_CENTER, 0, 10);
    },

    moveUser: function(userId, x, y) {
      var user = users[userId];
      user.x = x;
      user.y = y;
      updateUserGraphics(user);
      user.clientProcessed = Date.now();

      if (user.id == playerId) {
        updateCellWatchers(user, 'cell-data', handleCellData);
      }
    },

    removeUser: function(userData) {
      var user = users[userData.id];
      if (user) {
        user.sprite.destroy();
        user.label.destroy();
        delete users[userData.id];
      }
    },

    createTexturedSprite: function(options) {
      var sprite = game.add.sprite(0, 0, options.texture);
      sprite.anchor.setTo(0.5);

      return sprite;
    },

    createUserSprite: function(userData) {
      var user = {};
      users[userData.id] = user;
      user.id = userData.id;
      user.swid = userData.swid;
      user.name = userData.name;

      var textStyle = {
        font: '16px Arial',
        fill: '#666666',
        align: 'center'
      };

      user.label = game.add.text(0, 0, user.name, textStyle);
      user.label.anchor.set(0.5);

      var sprite;

      if (userData.id == playerId) {
        sprite = createTexturedSprite({
          texture: 'you-down'
        });
        user.texturePrefix = 'you';
      } else if (userData.subtype == 'bot') {
        sprite = createTexturedSprite({
          texture: 'bot-down'
        });
        user.texturePrefix = 'bot';
      } else {
        sprite = createTexturedSprite({
          texture: 'others-down'
        });
        user.texturePrefix = 'others';
      }

      user.score = userData.score;
      user.sprite = sprite;

      user.sprite.width = Math.round(userData.diam * 0.73);
      user.sprite.height = userData.diam;
      user.diam = user.sprite.width;

      moveUser(userData.id, userData.x, userData.y);

      if (userData.id == playerId) {
        player = user;
        game.camera.setSize(window.innerWidth, window.innerHeight);
        game.camera.follow(user.sprite, null, CAMERA_SMOOTHING, CAMERA_SMOOTHING);
      }
    },

    updatePlayerZIndexes: function() {
      var usersArray = [];
      for (var i in users) {
        if (users.hasOwnProperty(i)) {
          usersArray.push(users[i]);
        }
      }
      usersArray.sort(function (a, b) {
        if (a.y < b.y) {
          return -1;
        }
        if (a.y > b.y) {
          return 1;
        }
        return 0;
      });
      usersArray.forEach(function (user) {
        user.label.bringToTop();
        user.sprite.bringToTop();
      });
    },

    updateUser: function(userData) {
      var user = users[userData.id];
      if (user) {
        user.score = userData.score;
        user.direction = userData.direction;
        moveUser(userData.id, userData.x, userData.y);
      } else {
        createUserSprite(userData);
      }
    },

    removeCoin: function(coinData) {
      var coinToRemove = coins[coinData.id];
      if (coinToRemove) {
        coinToRemove.sprite.destroy();
        delete coins[coinToRemove.id];
      }
    },

    renderCoin: function(coinData) {
      if (coins[coinData.id]) {
        coins[coinData.id].clientProcessed = Date.now();
      } else {
        var coin = coinData;
        coins[coinData.id] = coin;
        coin.sprite = createTexturedSprite({
          texture: 'grass-' + (coinData.t || '1')
        });
        coin.sprite.x = coinData.x;
        coin.sprite.y = coinData.y;
        coin.clientProcessed = Date.now();
      }
    },

    create: function() {
      background = game.add.tileSprite(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT, 'background');
      game.time.advancedTiming = true;
      game.world.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

      // Generate a random name for the user.
      var playerName = 'user-' + Math.round(Math.random() * 10000);

      function joinWorld() {
        playState.socket.emit('join', {
          name: playerName,
        }, function (err, playerData) {
          playerId = playerData.id;
          playState.updateCellWatchers(playerData, 'cell-data', this.handleCellData);
        });
      }

      function removeAllUserSprites() {
        for (var i in users) {
          if (users.hasOwnProperty(i)) {
            removeUser(users[i]);
          }
        }
      }

      if (playState.socket.state == 'open') {
        joinWorld();
      }
      // For reconnect
      playState.socket.on('connect', joinWorld);
      playState.socket.on('disconnect', removeAllUserSprites);
    },

    lastActionTime: 0,

    update: function() {
      var didAction = false;
      var playerOp = {};
      if (keys.up.isDown) {
        playerOp.u = 1;
        didAction = true;
      } else {
        playerOp.u = 0;
      }
      if (keys.down.isDown) {
        playerOp.d = 1;
        didAction = true;
      } else {
        playerOp.d = 0;
      }
      if (keys.right.isDown) {
        playerOp.r = 1;
        didAction = true;
      } else {
        playerOp.r = 0;
      }
      if (keys.left.isDown) {
        playerOp.l = 1;
        didAction = true;
      } else {
        playerOp.l = 0;
      }
      if (keys.space.isDown) {
        playerOp.s = 1;
        didAction = true;
      } else {
        playerOp.s = 0;
      }
      if (didAction && Date.now() - lastActionTime >= this.USER_INPUT_INTERVAL) {
        lastActionTime = Date.now();
        // Send the player operations for the server to process.
        playState.socket.emit('action', playerOp);
      }
    },

    render: function() {
      var now = Date.now();

      if (this.ENVIRONMENT == 'dev') {
        game.debug.text('FPS:   ' + game.time.fps, 2, 14, "#00FF00");
        if (player) {
          game.debug.text('Score: ' + player.score, 2, 30, "#00FF00");
        }
      }

      for (var i in users) {
        if (users.hasOwnProperty(i)) {
          var curUser = users[i];
          if (now - curUser.clientProcessed > this.PLAYER_INACTIVITY_TIMEOUT) {
            removeUser(curUser);
          }
        }
      }

      for (var j in coins) {
        if (coins.hasOwnProperty(j)) {
          var curCoin = coins[j];
          if (now - curCoin.clientProcessed > this.COIN_INACTIVITY_TIMEOUT) {
            removeCoin(curCoin);
          }
        }
      }
    }

};
