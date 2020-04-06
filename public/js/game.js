/**We created the configuration that will be used for our Phaser game.
    
    In the config object, in the type field, we set the renderer type for our game. 
The two main types are Canvas and WebGL. WebGL is a faster renderer and has better performance, 
but not all browsers support it. By choosing AUTO for the type, Phaser will use WebGL if it is 
available, otherwise, it will use Canvas.
    
    In the config object, the parent field is used to tell Phaser to render our game in an 
existing  <canvas>  element with that id if it exists. If it does not exists, then Phaser 
will create a  <canvas>  element for us.

    In the config object, we specify the width and height of the viewable area of our game.

    In the config object, we enabled the arcade physics that is available in Phaser, and we set 
the gravity to 0.

    In the config object, we embedded a scene object which will use the  preload, update, and  
    create functions we defined.

    Lastly, we passed our config object to Phaser when we created the new game instance.**/

var config = {
  type: Phaser.AUTO, //Use WebGL if avail, otherwise Canvas.
  parent: "phaser-example", //Could this adding a canvas element conflict with the photo taking canvas?
  width: 800,
  height: 600,
  physics: {
    default: "arcade", //Physics
    arcade: {
      debug: false,
      gravity: { y: 0 },
    },
  },
  scene: {
    //Embedding a 'scene' object.
    preload: preload,
    create: create,
    update: update,
  },
};

var game = new Phaser.Game(config);

function preload() {
  this.load.image("planeblack", "assets/planeblack.png");
  this.load.image("shipblack", "assets/shipblack.png");
  this.load.image("bomb", "assets/bomb.png");
}

//Create is for any changes I receive, during a game even.
function create() {
  var self = this;
  this.socket = io();
  //Make a new socket, which is an instantiation of the io object we created in server.js.
  //Remember, the io object is the socket object listening to our server object.

  this.otherPlayers = this.physics.add.group();
  this.socket.on("currentPlayers", function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id]);
      } else {
        addOtherPlayers(self, players[id]);
      }
    });
  });
  this.socket.on("newPlayer", function (playerInfo) {
    addOtherPlayers(self, playerInfo);
  });
  this.socket.on("disconnect", function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy();
      }
    });
  });

  this.cursors = this.input.keyboard.createCursorKeys();
  //Populate the cursors object with our four main Key objects (up, down, left, and right),
  //which will bind to those arrows on the keyboard.

  this.socket.on("playerMoved", function (playerInfo) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerInfo.playerId === otherPlayer.playerId) {
        otherPlayer.setRotation(playerInfo.rotation);
        otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      }
    });
  });

  this.blueScoreText = this.add.text(16, 16, "", {
    fontSize: "32px",
    fill: "#0000FF",
  });
  this.redScoreText = this.add.text(584, 16, "", {
    fontSize: "32px",
    fill: "#FF0000",
  });

  this.socket.on("scoreUpdate", function (scores) {
    self.blueScoreText.setText("Blue: " + scores.blue);
    self.redScoreText.setText("Red: " + scores.red);
  });

  this.socket.on("starLocation", function (starLocation) {
    if (self.star) self.star.destroy();
    self.star = self.physics.add.image(starLocation.x, starLocation.y, "bomb");
    self.physics.add.overlap(
      self.ship,
      self.star,
      function () {
        this.socket.emit("starCollected");
      },
      null,
      self
    );
  });
}

//Update is about me the client socket making changes.
function update() {
  if (this.ship) {
    if (this.cursors.left.isDown) {
      this.ship.setAngularVelocity(-150);
    } else if (this.cursors.right.isDown) {
      this.ship.setAngularVelocity(150);
    } else {
      this.ship.setAngularVelocity(0);
    }
    if (this.cursors.up.isDown) {
      this.physics.velocityFromRotation(
        this.ship.rotation + 1.5,
        100,
        this.ship.body.acceleration
      );
    } else {
      this.ship.setAcceleration(0);
    }
    // this.physics.world.wrap(this.ship, 5);
    //Event horizon wrapping around.

    // emit player movement
    var x = this.ship.x;
    var y = this.ship.y;
    var r = this.ship.rotation;
    if (
      this.ship.oldPosition &&
      (x !== this.ship.oldPosition.x ||
        y !== this.ship.oldPosition.y ||
        r !== this.ship.oldPosition.rotation)
    ) {
      this.socket.emit("playerMovement", {
        x: this.ship.x,
        y: this.ship.y,
        rotation: this.ship.rotation,
      });
    }

    // save old position data
    this.ship.oldPosition = {
      x: this.ship.x,
      y: this.ship.y,
      rotation: this.ship.rotation,
    };
  }
}

function addPlayer(self, playerInfo) {
  self.ship = self.physics.add
    .image(playerInfo.x, playerInfo.y, "planeblack")
    .setOrigin(0.5, 0.5) //Set rotation point to centre of ship.
    .setDisplaySize(53, 40);
  if (playerInfo.team === "blue") {
    self.ship.setTint(0x0000ff);
  } else {
    self.ship.setTint(0xff0000);
  }
  self.ship.setDrag(100);
  self.ship.setAngularDrag(100);
  self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.add
    .sprite(playerInfo.x, playerInfo.y, "shipblack")
    .setOrigin(0.5, 0.5)
    .setDisplaySize(53, 40);
  if (playerInfo.team === "blue") {
    otherPlayer.setTint(0x0000ff);
  } else {
    otherPlayer.setTint(0xff0000);
  }
  otherPlayer.playerId = playerInfo.playerId;
  self.otherPlayers.add(otherPlayer);
}
