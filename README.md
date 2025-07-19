# Postman to MCP Server Generator

A powerful command-line tool to instantly generate a full-featured, production-ready MCP (Model Context Protocol) server from any Postman Collection 2.0 file.

## Features

- **Interactive CLI**: A user-friendly wizard guides you through the setup.
- **Multiple Server Modes**: Generate a server for STDIO, a stateless HTTP API, or a stateful HTTP server with session management.
- **Robust & Reliable**: Handles complex JSON keys, missing example responses, and ensures clean communication channels.

## Installation

npm install -g postman-to-mcp



## Usage

Simply run the command in your terminal:
postman-to-mcp --input ./path/to/your-collection.json

The interactive prompt will then ask you to choose a server mode, and it will generate a `.zip` file containing your ready-to-use MCP server.

---

## Upcoming Features & Roadmap

This project is actively maintained. Here are some of the exciting features and improvements planned for future releases:

### ✨ AI-Powered Enhancements

-   **Automatic Tool Naming & Descriptions**: An upcoming feature will allow the generator to use AI (via an optional OpenAI API key) to analyze your API endpoints and suggest clean, developer-friendly names and user-facing descriptions for your tools. This is perfect for collections that have minimal documentation.

### 🐞 Bug Fixes & Stability

-   **Continuous Improvements**: We are constantly working to improve schema inference and handle even more edge cases found in complex Postman collections.
-   **Dependency Updates**: Regular updates to ensure all underlying dependencies are secure and performant.

### 🚀 Performance

-   **Faster Generation**: Optimizing the generation process to create server projects even more quickly, especially for very large collections.

## Contributing

Have an idea for a feature or found a bug? We welcome contributions! Please feel free to open an issue or submit a pull request on our GitHub repository.
