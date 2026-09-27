import { Schema } from "mongoose";
import { defineModel } from "./define";

// Failed admin sign-in attempts, kept in the database so the limits hold
// across restarts and multiple server instances. _id is "global" or
// "ip:<sha256 of the IP>" (IPs aren't stored in readable form).
const throttleSchema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: () => new Date() },
  lockedUntil: Date,
});

const AuthThrottle = defineModel("AuthThrottle", throttleSchema);
export default AuthThrottle;
