import { randomBytes } from "node:crypto";

console.log("=== Managevent Production Secret Generator ===");
console.log("Keep these values secret! Never commit them to Git or paste in public channels.\n");

const piiKey = randomBytes(32).toString("base64");
const betterAuthSecret = randomBytes(32).toString("hex");
const guestTokenPepper = randomBytes(32).toString("hex");

console.log("1. PII_ENCRYPTION_KEY (32-byte Base64 AES-256-GCM key for Sydney Supabase/API):");
console.log(`   ${piiKey}\n`);

console.log("2. BETTER_AUTH_SECRET (32-byte Hex string for Sydney API sessions):");
console.log(`   ${betterAuthSecret}\n`);

console.log("3. GUEST_TOKEN_PEPPER (32-byte Hex string for invitation tokens):");
console.log(`   ${guestTokenPepper}\n`);

console.log("===============================================");
