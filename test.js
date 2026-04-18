const { Client } = require("@heroiclabs/nakama-js");

const client = new Client("defaultkey", "127.0.0.1", "7350", false);

const mode = process.argv[2];
const matchIdArg = process.argv[3];

async function run() {
  try {
    const deviceId =
      mode === "create"
        ? "device-creator-123456789"
        : "device-joiner-987654321";

    const session = await client.authenticateDevice(deviceId, true);
    console.log("Authenticated:", session.user_id);

    const socket = client.createSocket(false);
    await socket.connect(session);
    console.log("Socket connected");

    let matchId;
    let match;

    if (mode === "create") {
      // Call server RPC to create authoritative match
      const rpcResult = await client.rpc(session, "create_match", "");
      console.log("RPC result:", JSON.stringify(rpcResult));
      matchId = rpcResult.payload.match_id;
      console.log("Match created:", matchId);

      match = await socket.joinMatch(matchId);
      console.log("Joined match (creator)");
    } else {
      matchId = matchIdArg;
      match = await socket.joinMatch(matchId);
      console.log("Joined match (joiner)");
    }

    let players = match.presences ? match.presences.length : 0;
    console.log("Initial players:", players);

    socket.onmatchpresence = (presence) => {
      console.log("Presence update:", presence);
      if (presence.joins) players += presence.joins.length;
      if (presence.leaves) players -= presence.leaves.length;
      console.log("Players now:", players);
    };

    socket.onmatchdata = (data) => {
      const decoded = new TextDecoder().decode(data.data);
      console.log("Decoded message:", decoded);
      try {
        const parsed = JSON.parse(decoded);
        console.log("Parsed data:", parsed);
      } catch (e) {
        console.log("Raw decoded:", decoded);
      }
    };

    let moveSent = false;

socket.onmatchpresence = async (presence) => {
  console.log("Presence update:", presence);

  if (presence.joins) players += presence.joins.length;
  if (presence.leaves) players -= presence.leaves.length;

  console.log("Players now:", players);

  if (players >= 2 && mode === "create" && !moveSent) {
    moveSent = true;

    console.log("Both players connected ✅");

    await socket.sendMatchState(
      matchId,
      1,
      JSON.stringify({ index: 0 })
    );

    console.log("Move sent by creator");
  }
};

    console.log("Client running... press Ctrl+C to stop");

  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();