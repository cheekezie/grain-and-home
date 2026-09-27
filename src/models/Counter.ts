import { Schema } from "mongoose";
import { defineModel } from "./define";

// Atomic sequence for human-friendly numbers (orders 1001, 1002...). The
// offset is added on read: an upsert with $inc starts from 0 and ignores
// schema defaults.
const START = 1000;
const counterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });
const Counter = defineModel("Counter", counterSchema);

export async function nextSequence(name: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true }).lean();
  return START + (doc as { seq: number }).seq;
}

export default Counter;
