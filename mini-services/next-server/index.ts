// Next.js server - mini service
import { spawn } from "child_process";

console.log("Starting Next.js server on port 3000...");

const server = spawn("bun", ["x", "next", "dev", "-p", "3000"], {
  cwd: "/home/z/my-project",
  stdio: "inherit",
  env: { ...process.env }
});

server.on("error", (err) => {
  console.error("Failed to start server:", err);
});

server.on("exit", (code, signal) => {
  console.log(`Server exited with code ${code}, signal ${signal}`);
  process.exit(code || 1);
});

process.on("SIGTERM", () => {
  server.kill("SIGTERM");
});

process.on("SIGINT", () => {
  server.kill("SIGINT");
});
