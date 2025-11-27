import { connect, StringCodec } from "nats";

const codec = StringCodec();

async function testMatchCreate() {
  try {
    console.log("Connecting to NATS...");
    // Use "nats" hostname in Docker environment
    const natsUrl = process.env.NATS_URL || "nats://nats:4222";
    const nc = await connect({ servers: natsUrl });
    console.log(`✅ Connected to NATS at ${natsUrl}`);

    // Test data for creating a match
    const matchData = {
      player1Id: 3, // Player1
      player2Id: 4, // Player2
      precisionPlayer1: 88.5,
      precisionPlayer2: 75.2,
      scoreP1: 10,
      scoreP2: 7,
    };

    console.log("\n📤 Sending match.create request with data:", matchData);

    const response = await nc.request(
      "match.create",
      codec.encode(JSON.stringify(matchData)),
      { timeout: 5000 }
    );

    const decodedResponse = JSON.parse(codec.decode(response.data));
    console.log("\n📥 Response from match.create:", JSON.stringify(decodedResponse, null, 2));

    if (decodedResponse.success) {
      console.log("\n✅ Match created successfully!");
      console.log(`   Match ID: ${decodedResponse.match.id}`);
      console.log(`   Winner: Player ${decodedResponse.match.winner_id}`);
    } else {
      console.error("\n❌ Failed to create match:", decodedResponse.error);
    }

    await nc.close();
    console.log("\n🔌 Connection closed");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

console.log("🧪 Testing NATS Match Creation\n");
testMatchCreate();
