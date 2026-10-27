import crypto from "node:crypto";

export const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString("base64url");
