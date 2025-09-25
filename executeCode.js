// executeCode.js

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const fs = require("fs").promises;
const { v4: uuid } = require("uuid");

const executeCode = (language, code, input) => {
  return new Promise((resolve, reject) => {
    
    // --- Python Handler ---
    if (language === "py") {
      // FIX: Changed "python3" to "python" for better Windows compatibility.
      const childProcess = spawn("python", ["-c", code]);
      
      let output = "";
      let error = "";

      childProcess.on('error', (err) => {
          // This catches the error if 'python' command is not found at all.
          return reject({ error: "Python command not found. Make sure Python is installed and added to your system's PATH." });
      });

      childProcess.stdout.on("data", (data) => (output += data.toString()));
      childProcess.stderr.on("data", (data) => (error += data.toString()));
      childProcess.on("close", (code) => {
        if (code !== 0) return reject({ error });
        resolve(output);
      });

      childProcess.stdin.write(input);
      childProcess.stdin.end();

    // --- C++ and C Handler ---
    } else if (language === "cpp" || language === "c") {
      const compiler = language === "cpp" ? "g++" : "gcc";
      // FIX: Added langIdentifier to use "c++" for g++ instead of "cpp".
      const langIdentifier = language === "cpp" ? "c++" : "c";
      const executableName = `${uuid()}${os.platform() === "win32" ? ".exe" : ""}`;
      const executablePath = path.join(os.tmpdir(), executableName);

      const compile = spawn(compiler, ["-x", langIdentifier, "-o", executablePath, "-"]);
      
      let compileError = "";
      compile.stderr.on("data", (data) => (compileError += data.toString()));
      compile.on("close", (code) => {
        if (code !== 0) {
          return reject({ error: compileError || "Compilation failed" });
        }
        
        const run = spawn(executablePath);
        let output = "";
        let runError = "";

        run.stdout.on("data", (data) => (output += data.toString()));
        run.stderr.on("data", (data) => (runError += data.toString()));
        run.on("close", async (code) => {
          await fs.unlink(executablePath).catch(e => console.error("Cleanup failed:", e));
          if (code !== 0) return reject({ error: runError });
          resolve(output);
        });
        
        run.stdin.write(input);
        run.stdin.end();
      });
      
      compile.stdin.write(code);
      compile.stdin.end();

    // --- Java Handler ---
    } else if (language === "java") {
        const className = "Main";
        const tempDir = path.join(os.tmpdir(), uuid());
        const filePath = path.join(tempDir, `${className}.java`);

        (async () => {
            try {
                await fs.mkdir(tempDir, { recursive: true });
                await fs.writeFile(filePath, code);

                const compile = spawn("javac", [filePath]);
                let compileError = "";
                compile.stderr.on("data", (data) => (compileError += data.toString()));
                
                compile.on("close", (code) => {
                    if (code !== 0) {
                        fs.rm(tempDir, { recursive: true, force: true });
                        return reject({ error: compileError });
                    }

                    const run = spawn("java", ["-cp", tempDir, className]);
                    let output = "";
                    let runError = "";

                    run.stdout.on("data", (data) => (output += data.toString()));
                    run.stderr.on("data", (data) => (runError += data.toString()));
                    run.on("close", async (code) => {
                        await fs.rm(tempDir, { recursive: true, force: true });
                        if (code !== 0) return reject({ error: runError });
                        resolve(output);
                    });

                    run.stdin.write(input);
                    run.stdin.end();
                });

            } catch (e) {
                if (tempDir) {
                    await fs.rm(tempDir, { recursive: true, force: true }).catch(err => console.error("Cleanup failed:", err));
                }
                reject({ error: e.message });
            }
        })();
    } else {
        return reject({ error: "Unsupported language" });
    }
  });
};

module.exports = { executeCode };