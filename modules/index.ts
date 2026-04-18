function checkWinner(board: string[]) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== "")) return "draw";
  return null;
}

function matchInit(ctx:any, logger:any, nk:any, params:any) {
  logger.info("Match created");
  return {
    state: {
      board: ["","","","","","","","",""],
      players: [] as string[],
      currentPlayer: "X",
      gameOver: false,
      started: false  // ← new flag
    },
    tickRate: 1
  };
}

function matchJoinAttempt(ctx:any, logger:any, nk:any, dispatcher:any, tick:any, state:any, presence:any, metadata:any) {
  if (state.players.length >= 2) {
    return { state, accept: false, rejectMessage: "Match is full" };
  }
  return { state, accept: true };
}

function matchJoin(ctx:any, logger:any, nk:any, dispatcher:any, tick:any, state:any, presences:any) {
  presences.forEach((p:any) => {
    if (!state.players.includes(p.userId)) {
      state.players.push(p.userId);
    }
  });
  // Removed broadcast from here — matchLoop handles it reliably
  return { state };
}

function matchLoop(ctx:any, logger:any, nk:any, dispatcher:any, tick:any, state:any, messages:any) {

  // Broadcast game start every tick until both clients are ready
  if (state.players.length === 2 && !state.started) {
    state.started = true;
    dispatcher.broadcastMessage(3, JSON.stringify({
      board: state.board,
      currentPlayer: state.currentPlayer,
      players: { X: state.players[0], O: state.players[1] }
    }));
  }

  if (state.gameOver) return { state };

  messages.forEach((msg:any) => {
    try {
      const decoded = String.fromCharCode(...new Uint8Array(msg.data));
      const data = JSON.parse(decoded);
      const index = data.index;
      const userId = msg.sender.userId;

      const expectedUserId = state.currentPlayer === "X"
        ? state.players[0]
        : state.players[1];

      if (userId !== expectedUserId) {
        logger.warn("Wrong player's turn: " + userId);
        return;
      }

      if (state.board[index] !== "") {
        logger.warn("Cell already filled: " + index);
        return;
      }

      state.board[index] = state.currentPlayer;
      state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";

      const winner = checkWinner(state.board);

      dispatcher.broadcastMessage(1, JSON.stringify({
        board: state.board,
        currentPlayer: state.currentPlayer,
        winner: winner
      }));

      if (winner) {
        state.gameOver = true;
      }

    } catch (err) {
      logger.error("Error in matchLoop: " + err);
    }
  });

  return { state };
}

function matchLeave(ctx:any, logger:any, nk:any, dispatcher:any, tick:any, state:any, presences:any) {
  if (!state.gameOver) {
    state.gameOver = true;
    dispatcher.broadcastMessage(4, JSON.stringify({
      reason: "opponent_left"
    }));
  }
  return { state };
}

function matchTerminate(ctx:any, logger:any, nk:any, dispatcher:any, tick:any, state:any, graceSeconds:any) {
  return { state };
}

function matchSignal(ctx:any, logger:any, nk:any, dispatcher:any, tick:any, state:any, data:any) {
  return { state, data };
}

function rpcCreateMatch(ctx:any, logger:any, nk:any, payload:any): string {
  const matchId = nk.matchCreate("tic-tac-toe", {});
  return JSON.stringify({ match_id: matchId });
}

function matchmakerMatched(ctx: any, logger: any, nk: any, matches: any): string {
  const matchId = nk.matchCreate("tic-tac-toe", {});
  logger.info("Matchmaker created authoritative match: " + matchId);
  return matchId;
}

function InitModule(ctx:any, logger:any, nk:any, initializer:any) {
  initializer.registerMatch("tic-tac-toe", {
    matchInit: matchInit,
    matchJoinAttempt: matchJoinAttempt,
    matchJoin: matchJoin,
    matchLoop: matchLoop,
    matchLeave: matchLeave,
    matchTerminate: matchTerminate,
    matchSignal: matchSignal
  });

  initializer.registerRpc("create_match", rpcCreateMatch);

  initializer.registerMatchmakerMatched(matchmakerMatched);

  logger.info("Match registered");
}