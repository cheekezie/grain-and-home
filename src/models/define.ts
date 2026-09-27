import { model, models, type InferSchemaType, type Model, type Schema } from "mongoose";

/**
 * Register a model once per process. In development, Next's hot reload
 * re-runs model files but Mongoose keeps the first compiled model, so a
 * newly added field would be silently stripped on save until a restart.
 * Re-registering in development picks up schema edits immediately.
 */
export function defineModel<S extends Schema>(name: string, schema: S): Model<InferSchemaType<S>> {
  if (process.env.NODE_ENV !== "production" && models[name]) {
    delete models[name];
  }
  return (models[name] ?? model(name, schema)) as unknown as Model<InferSchemaType<S>>;
}
