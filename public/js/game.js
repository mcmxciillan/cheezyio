var game = new Phaser.Game(window.innerWidth, window.innerHeight);

// Add all the states
game.state.add('menu', menuState);
game.state.add('play', playState);

// Start boot state
game.state.start('menu');

module.exports = game;
