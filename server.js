//A basic Node.js server that will serve our game file

var express = require("express");
var app = express();
var server = require("http").Server(app);

//Now let's have the socket object listen to our server object.
var io = require("socket.io").listen(server);
//When this project gets more complex, should we export this io above instead of doing global var?

//Now look, here we're storing our game data on the server. But irl we'd want to database it, then if server failed, we'd still recover state of the game.
var players = {};
var star = {
  x: Math.floor(Math.random() * 700) + 50,
  y: Math.floor(Math.random() * 500) + 50,
};
var scores = {
  blue: 0,
  red: 0,
};

app.use(express.static(__dirname + "/public"));

//Please serve the index.html file as the root page.
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

//What we want the 'socket object listening to our server object' to do under partic conditions.
io.on("connection", function (socket) {
  //Look above! This is where 'socket' is created as an argument. It is an incoming socket connexion from a client,
  //whereas 'io' is the Socket.io server instance, listening to our http server.
  console.log("a user connected");
  // create a new player and add it to our players object
  players[socket.id] = {
    rotation: 0,
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50,
    playerId: socket.id,
    team: Math.floor(Math.random() * 2) == 0 ? "red" : "blue",
  };

  socket.emit("currentPlayers", players); // send the full players object to just the new player

  socket.emit("starLocation", star);
  socket.emit("scoreUpdate", scores);

  socket.broadcast.emit("newPlayer", players[socket.id]); // update all other players (but not current) of the new player

  socket.on("disconnect", function () {
    console.log("user disconnected");

    delete players[socket.id]; // remove this player from our players object

    io.emit("disconnect", socket.id); // emit a message to all players to remove this player
  });

  // when a player moves, update the player data
  socket.on("playerMovement", function (movementData) {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    players[socket.id].rotation = movementData.rotation;
    // emit a message to all players about the player that moved
    socket.broadcast.emit("playerMoved", players[socket.id]);
  });

  socket.on("starCollected", function () {
    if (players[socket.id].team === "red") {
      scores.red += 10;
    } else {
      scores.blue += 10;
    }
    star.x = Math.floor(Math.random() * 700) + 50;
    star.y = Math.floor(Math.random() * 500) + 50;
    io.emit("starLocation", star);
    io.emit("scoreUpdate", scores);
  });
});

server.listen(8081, function () {
  console.log(`Listening on ${server.address().port}`);
});
