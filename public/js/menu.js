var menuState = {

  preload: function(){

  var BACKGROUND_TEXTURE = '../img/background-texture.png';
  game.load.image('background', BACKGROUND_TEXTURE);

  game.load.image('playButton', '../img/playButton.png');

  },

    create: function(){

        var nicknameLabel, nickname, titleLabel;

        this.game.add.tileSprite(0, 0, this.game.world.width, this.game.world.height, 'background');
        //this.game.add.plugin(PhaserInput.Plugin);

            // Display the name of the game
            titleLabel = game.add.text(game.width / 2, -50, "Cheese.io", {
                font: '50px Josefin Slab',
                fill: '#000000'
            });
            titleLabel.anchor.setTo(.5);
            /** Name Tween **/
            game.add.tween(titleLabel).to({y: 90}, 1000).easing(Phaser.Easing.Bounce.Out).start();




            // nicknameLabel = game.add.text(game.width / 2, game.height / 2.2, 'Enter your name or sign in!', {
            //     font: '25px Josefin Slab',
            //     fill: '#ffffff'
            // });
            // nicknameLabel.anchor.setTo(.5);
            //
            // this.nickname = game.add.inputField(game.width / 2 - 80, game.height / 2, {
            //     font: '20px Josefin Slab',
            //     placeholder: 'Nickname',
            //     placeholderColor: '#FFFFFF',
            //     type: PhaserInput.InputType.text,
            //     max: 15
            // });
            // this.nickname.height = 25;
            // this.nickname.width = 250;
            // this.nickname.startFocus();
            //
            // playerName = this.nickname.value;

            this.playButton = game.add.button(game.width / 2, game.height / 2, 'playButton', this.start, this);
            this.playButton.anchor.setTo(.5);
            this.playButton.scale.setTo(.08);



    },

    // update: function(){
    //     this.nickname.update();
    // },

    start: function(){


        game.state.start('play');
        //playState.nickname = this.nickname.value;

    },

};
