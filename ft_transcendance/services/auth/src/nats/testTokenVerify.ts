import { connect, StringCodec } from "nats";

const codec = StringCodec();

async function testTokenVerify() {
  const nc = await connect({ servers: "nats://localhost:4222" });

  const token = "your_test_jwt_token_here"; // Replace with a valid or invalid JWT token for testing

  const response = await nc.request("auth.token.verify", codec.encode(JSON.stringify({ token })), {
    timeout: 5000,
  });

  const decodedResponse = JSON.parse(codec.decode(response.data));
  console.log("Response from auth.token.verify:", decodedResponse);

  await nc.close();
}

testTokenVerify().catch((err) => {
  console.error("Error testing token verification:", err);
});