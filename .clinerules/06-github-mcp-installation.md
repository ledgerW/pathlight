Build from source
If you don't have Docker, you can use go build to build the binary in the cmd/github-mcp-server directory, and use the github-mcp-server stdio command with the GITHUB_PERSONAL_ACCESS_TOKEN environment variable set to your token. To specify the output location of the build, use the -o flag. You should configure your server to use the built executable as its command. For example:

{
  "mcp": {
    "servers": {
      "github": {
        "command": "/path/to/github-mcp-server",
        "args": ["stdio"],
        "env": {
          "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>"
        }
      }
    }
  }
}

Github MCP Repo: https://github.com/github/github-mcp-server