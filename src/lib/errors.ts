// An error the user caused and should read ("your top 10 is full", "too many changes"). Its
// message reaches the UI, and the server-function log records it as a warning, not a failure
// (src/start.ts).
export class UserFacingError extends Error {}
