const { refObject, world } = require('@tabletop-playground/api');

const { Chess } = require("./chessengine/chess");
const { ChessAI } = require("./chessengine/chessai");
refObject.chessAI = ChessAI(new Chess());

refObject.player = world.getAllPlayers()[0];


/**
 * Returns a chess position for the given world coordinates
 * e.g. Vector(23.2, 64.6, -5.0) → A4
 */
refObject.worldPosToChessPos = function(pos)
{
    var localPos = this.worldPositionToLocal(pos);
    var col = String.fromCharCode(96 + Math.floor(4.587 - localPos.y / 5.572 + 0.5));
    var row = Math.floor(4.547 - localPos.x / 5.572 + 0.5);
    return col+row;
}


/**
 * Returns a world position vector for the given chess position
 * e.g. A4 → Vector(23.2, 64.6, -5.0)
 */
refObject.chessPosToWorldPos = function(chessPos)
{
    var x = (96 + 4.578 - chessPos.charCodeAt(0)) * 5.572;
    var y = (chessPos[1] - 4.547) * 5.572;
    return new Vector(x, y, this.getPosition().z + 1);
}


/**
 * Look for chess pieces at the given position and return it if existing
 */
refObject.findChessPieceAtPosition = function(pos)
{
    var result = [];
    var from = pos.add(new Vector(0, 0, -10));
    var to = pos.add(new Vector(0, 0, 10));
    var matches = world.lineTrace(from, to);
    if (matches)
    {
        // filter out chessboard from results
        for (var i = 0; i < matches.length; i++)
        {
            if (matches[i].object.getId() != this.getId())
            {
                result.push(matches[i].object);
            }
        }
    }
    return result;
}


/**
 * Moves a chesspiece to a discard pile
 */
refObject.discardChessPiece = function(piece)
{
    var locPos = this.getSnapPoint(0).getLocalPosition();
    // use different discard piles for black and white pieces
    if (piece.getTemplateName().includes("White"))
    {
        // right side of the board (white view)
        locPos = locPos.add(new Vector(20, -20, 20));
    }
    else
    {
        // left side of the board (white view)
        locPos = locPos.add(new Vector(20, 70, 20));
    }
    // move pice to discard pile and set to random rotation
    piece.setObjectType(0); // set regular object so physics are simulated
    piece.setPosition(this.localPositionToWorld(locPos));
    piece.setRotation(new Rotator(Math.random() * 360, Math.random() * 360, Math.random() * 360), 1);
}


/**
 * Custom function to be called by (white) chess pieces after they have moved
 */
refObject.onPieceMoved = function(piece, grabPosition)
{
    // first translate from vector positions into chess language e.g. a2
    var from = this.worldPosToChessPos(grabPosition);
    var to = this.worldPosToChessPos(piece.getPosition());

    // make sure the the piece was actually moved and not just snapped in place
    if (from !== to)
    {
        // first see if there is already a piece at this position
        matches = this.findChessPieceAtPosition(piece.getPosition());
        if (matches.length == 2)
        {
            // remove the lower chess piece and put it on the discard pile
            this.discardChessPiece(matches[0]);
        }

        // tell AI about the move and print the chess state to console
        console.log("Player move", from, "->", to);
        this.chessAI.move(from, to);
        if (this.chessAI.in_checkmate()) { this.endGame("Checkmate!"); return; }
        if (this.chessAI.in_stalemate()) { this.endGame("Draw!"); return; }
        
        // handle AI response in next tick.
        // it can take a second or two to calculate the response, which leads to the
        // game freezing for a bit. If the player move is finished first, it's not notieceable
        var refObject = this; // set explicitly so we can use it in the nexttick callback
        process.nextTick(function(){
            // let the AI decide on a good move to make next
            var move = refObject.chessAI.get_best_move();
            console.log("Response", move.from, "->", move.to);

            // translate AI move back into actual positions
            var ifrom = refObject.chessPosToWorldPos(move.from);
            var ito = refObject.chessPosToWorldPos(move.to);

            // try to execute the ai move
            var matches = refObject.findChessPieceAtPosition(ifrom);
            if (matches.length == 1)
            {

                process.nextTick(function(){

                    // see if there is already a piece at the position and remove it
                    var existingObjects = refObject.findChessPieceAtPosition(ito);
                    if (existingObjects.length == 1)
                    {
                        refObject.discardChessPiece(existingObjects[0]);
                    }

                    // then execute the move
                    matches[0].setPosition(ito, 1);
                    matches[0].snap();

                    // tell the ai that the move has been executed and print state to console
                    refObject.chessAI.move(move.from, move.to);
                    refObject.chessAI.print();

                    if (refObject.chessAI.in_checkmate()) { refObject.endGame("Checkmate!"); return; }
                    if (refObject.chessAI.in_stalemate()) { refObject.endGame("Draw!"); return; }
                    if (refObject.chessAI.in_check()) { refObject.playerMessage("Check"); }
                });
            }
            else
            {
                console.log("Found", matches.length, "number of chess pieces at", ifrom, move.from, "but expected 1");
            }
        });
    }
}

/**
 * Send a message to all players
 */
refObject.playerMessage = function(message)
{
    // Send check to all players
    world.getAllPlayers().forEach(
        function(player)
        {
            player.sendChatMessage(message, new Color(150, 150, 10, 255));
            player.showMessage(message);
        }
    );
}


/**
 * Sets the game to end state with the given reason
 */
refObject.endGame = function(reason)
{

    this.playerMessage(reason);

    // set all chess pieces to ground type -> no more moves
    world.getAllObjects().forEach(
        function(obj)
        {
			obj.setObjectType(1);
        }
    );
}
