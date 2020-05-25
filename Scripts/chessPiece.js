const { refObject } = require('@tabletop-playground/api');


refObject.onCreated.add(
	function(obj)
	{
		// "disable" player interactions for black pieces
		if (obj.getTemplateName().includes("Black"))
		{
			obj.setObjectType(1); // set to ground object to prevent player interaction
		}
	}
);

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
