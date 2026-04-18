import { useState, useRef } from "react";
import { Client } from "@heroiclabs/nakama-js";

const client = new Client("defaultkey", "nakama-tictactoe-production-4bad.up.railway.app", "443", true);

function getDeviceId(username) {
  const key = "ttt_device_" + username;
  let id = localStorage.getItem(key);
  if (!id) {
    id = "device-" + username + "-" + crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

const SCREENS = {
  LOGIN: "login",
  LOBBY: "lobby",
  WAITING: "waiting",
  GAME: "game",
  RESULT: "result"
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LOGIN);
  const [username, setUsername] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [board, setBoard] = useState(Array(9).fill(""));
  const [mySymbol, setMySymbol] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState("X");
  const [resultMessage, setResultMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const sessionRef = useRef(null);
  const socketRef = useRef(null);
  const matchIdRef = useRef(null);
  const mySymbolRef = useRef(null);

  function handleMatchData(data, userId) {
    const decoded = new TextDecoder().decode(data.data);
    const parsed = JSON.parse(decoded);

    if (data.op_code === 3) {
      const symbol = parsed.players.X === userId ? "X" : "O";
      mySymbolRef.current = symbol;
      setMySymbol(symbol);
      setBoard(parsed.board);
      setCurrentPlayer(parsed.currentPlayer);
      setScreen(SCREENS.GAME);
    }

    if (data.op_code === 1) {
      setBoard(parsed.board);
      setCurrentPlayer(parsed.currentPlayer);
      if (parsed.winner) {
        if (parsed.winner === "draw") setResultMessage("It's a Draw!");
        else if (parsed.winner === mySymbolRef.current) setResultMessage("You Win! 🎉");
        else setResultMessage("You Lose 😢");
        setScreen(SCREENS.RESULT);
      }
    }

    if (data.op_code === 4) {
      setResultMessage("Opponent left the game");
      setScreen(SCREENS.RESULT);
    }
  }

  async function login() {
  if (!username.trim()) return;
  const deviceId = getDeviceId(username);
  let session;
  try {
    session = await client.authenticateDevice(deviceId, true, username);
  } catch {
    try {
      session = await client.authenticateDevice(deviceId, false);
    } catch {
      alert("Username already taken. Please try a different username.");
      return;
    }
  }
  sessionRef.current = session;
  const socket = client.createSocket(true);
  await socket.connect(session);
  socketRef.current = socket;
  socket.onmatchdata = (data) => handleMatchData(data, session.user_id);
  setScreen(SCREENS.LOBBY);
}

  async function createMatch() {
    const rpcResult = await client.rpc(sessionRef.current, "create_match", "");
    const id = rpcResult.payload.match_id;
    matchIdRef.current = id;
    await socketRef.current.joinMatch(id);
    setStatusMsg("Waiting for opponent... Share this ID: " + id);
    setScreen(SCREENS.WAITING);
  }

  async function joinMatch() {
    const id = joinInput.trim();
    matchIdRef.current = id;
    await socketRef.current.joinMatch(id);
    setStatusMsg("Joined! Waiting for game to start...");
    setScreen(SCREENS.WAITING);
  }

  async function findMatch() {
    setStatusMsg("Finding a random player... it usually takes 20 seconds.");
    setScreen(SCREENS.WAITING);

    socketRef.current.onmatchmakermatched = async (matched) => {
      socketRef.current.onmatchdata = (data) => handleMatchData(data, sessionRef.current.user_id);
      const match = await socketRef.current.joinMatch(matched.match_id);
      matchIdRef.current = match.match_id;
    };

    await socketRef.current.addMatchmaker("*", 2, 2, {});
  }

  async function makeMove(index) {
  if (currentPlayer !== mySymbol) return;
  if (board[index] !== "") return;
  await socketRef.current.sendMatchState(
    matchIdRef.current, 1, JSON.stringify({ index })
  );
}

  function renderCell(index) {
  const val = board[index];
  const isMyTurn = currentPlayer === mySymbol;
  const isEmpty = val === "";
  return (
    <button
      key={index}
      onClick={() => makeMove(index)}
      style={{
        width: 100, height: 100,
        fontSize: 36, fontWeight: "bold",
        cursor: isEmpty && isMyTurn ? "pointer" : "not-allowed",
        background: val === "X" ? "#ffecec" : val === "O" ? "#ecf0ff" : "#fff",
        border: "3px solid #333",
        color: val === "X" ? "#e74c3c" : "#3498db"
      }}
    >
      {val}
    </button>
  );
}

  if (screen === SCREENS.LOGIN) return (
    <div style={styles.center}>
      <h1>Tic Tac Toe</h1>
      <input
        placeholder="Enter your username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        onKeyDown={e => e.key === "Enter" && login()}
        style={styles.input}
      />
      <button onClick={login} style={styles.btn}>Continue</button>
    </div>
  );

  if (screen === SCREENS.LOBBY) return (
    <div style={styles.center}>
      <h2>Welcome, {username}!</h2>
      <button onClick={findMatch} style={{...styles.btn, background: "#27ae60"}}>
        🔍 Find Random Match
      </button>
      <p>— or create/join manually —</p>
      <button onClick={createMatch} style={styles.btn}>Create Match</button>
      <p>— or join existing —</p>
      <input
        placeholder="Paste Match ID"
        value={joinInput}
        onChange={e => setJoinInput(e.target.value)}
        style={styles.input}
      />
      <button onClick={joinMatch} style={styles.btn}>Join Match</button>
    </div>
  );

  if (screen === SCREENS.WAITING) return (
    <div style={styles.center}>
      <h2>⏳ Waiting...</h2>
      <p style={{ wordBreak: "break-all", maxWidth: 300 }}>{statusMsg}</p>
    </div>
  );

  if (screen === SCREENS.GAME) return (
    <div style={styles.center}>
      <h2>You are: <span style={{ color: mySymbol === "X" ? "#e74c3c" : "#3498db" }}>{mySymbol}</span></h2>
      <p>{currentPlayer === mySymbol ? "Your turn ✅" : "Opponent's turn ⏳"}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 100px)", gap: 4 }}>
        {Array(9).fill(null).map((_, i) => renderCell(i))}
      </div>
    </div>
  );

  if (screen === SCREENS.RESULT) return (
    <div style={styles.center}>
      <h1>{resultMessage}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 80px)", gap: 4, margin: "20px 0" }}>
        {board.map((val, i) => (
          <div key={i} style={{
            width: 80, height: 80, fontSize: 28, fontWeight: "bold",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #333",
            color: val === "X" ? "#e74c3c" : "#3498db"
          }}>{val}</div>
        ))}
      </div>
      <button onClick={() => window.location.reload()} style={styles.btn}>Play Again</button>
    </div>
  );
}

const styles = {
  center: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: "100vh", gap: 12,
    fontFamily: "sans-serif"
  },
  input: {
    padding: "10px 16px", fontSize: 16, borderRadius: 8,
    border: "2px solid #333", width: 280
  },
  btn: {
    padding: "12px 32px", fontSize: 16, borderRadius: 8,
    background: "#3498db", color: "#fff", border: "none",
    cursor: "pointer", fontWeight: "bold"
  }
};