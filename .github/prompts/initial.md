create a new npm-published project named mcp-server that acts as a Machine Control Protocol server for Windows, allowing an AI agent to control the system like Playwright controls the browser. This tool will be used by GitHub Copilot Chat extension in VS Code to issue system-level automation commands.

follow the latest best practices in TypeScript, Node.js, security, testing, and project structure. set up the project with pnpm workspaces and strict tsconfig. include full type safety, ESLint, Prettier, commitlint, husky, and Vitest for unit tests. use esbuild or tsup to bundle the CLI/server.

create a minimal but extensible plugin-based server architecture. expose a local REST and WebSocket API on localhost:7700 secured with a local token file (~/.mcp-token). auto-generate OpenAPI spec and a client SDK. allow the agent to issue commands like:

window.focus({ title: string })

keyboard.type({ text: string })

mouse.move({ x: number, y: number })

system.exec({ command: string })

clipboard.get()

clipboard.set({ text: string })

filesystem.read({ path: string })

filesystem.write({ path: string, content: string })

implement the control layer using native Windows APIs via node-ffi-napi, edge-js, or subprocesses (PowerShell, AutoHotkey, nircmd). wrap each module with async error-handled controllers.

include a /playground command in CLI to test commands interactively. generate OpenAPI doc at /docs.

add a README.md with usage instructions, security disclaimer, and example agent integrations. publish the package under the scoped name @codai/mcp-server and prepare for it to be used inside GitHub Copilot Chat to run commands via npx mcp-server.

ensure everything is modular, tested, documented, and ready to scale as the OS-level equivalent of Playwright. It's going to be named GlassMCP. Think for a plan, think to have all the tools implemented and tested and working. Create files for documentation and instructions for ai copilot agent in .github folder. After that ask me if you should proceed with the plan