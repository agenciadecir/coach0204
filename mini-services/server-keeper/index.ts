import { $ } from "bun";

console.log("Server keeper starting...");

async function startServer() {
  try {
    // Usamos spawn para que el proceso sea hijo de este
    const proc = Bun.spawn(["bun", "x", "next", "dev", "-p", "3000"], {
      cwd: "/home/z/my-project",
      stdout: "inherit",
      stderr: "inherit",
    });
    
    console.log("Server started with PID:", proc.pid);
    
    // Esperar a que el proceso termine
    const exitCode = await proc.exited;
    console.log("Server exited with code:", exitCode);
    
    return exitCode;
  } catch (error) {
    console.error("Error starting server:", error);
    return 1;
  }
}

// Mantener el servidor vivo
while (true) {
  const code = await startServer();
  console.log("Restarting server in 3 seconds...");
  await new Promise(r => setTimeout(r, 3000));
}
