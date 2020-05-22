const { refObject } = require('@tabletop-playground/api');
const { world } = require('@tabletop-playground/api');


// hook our move function up to be called by Tabletop Playground whenever something snaps to something.
// Since we know how we set up the game table, all snap events are always chess pieces that have been
// moved on the board
refObject.onSnapped.add(
	function(obj, player, snapPoint, grabPosition)
	{
		// just inform the chess board
		var parent = snapPoint.getParentObject();
		if (parent.getId() == "chessboard") {
			parent.onPieceMoved(obj, grabPosition);
		}
	}
);
