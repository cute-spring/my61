# Confluence Chat Function: Design and User Guide

This document provides a comprehensive overview of the Confluence Chat function, including its architecture, configuration, and a step-by-step user guide.

## 1. Design Goals

The primary goals of the Confluence Chat function are:

*   **Seamless Integration:** Allow users to interact with Confluence pages directly within the chat interface.
*   **Multi-Instance Support:** Enable users to connect to and switch between multiple Confluence instances.
*   **Rich Interaction:** Provide a set of commands for managing context, authentication, and other settings.
*   **Secure Authentication:** Use Personal Access Tokens (PATs) for secure API access.
*   **Centralized Configuration:** Offer a simple and clear way to configure Confluence instances.

## 2. Architecture

The Confluence Chat function is built upon several key components that work together to provide a seamless experience.

### Key Components

*   **`ConfluenceConfigManager` (`src/tools/confluence/config.ts`):**
    *   Manages the configuration of Confluence instances.
    *   Reads and writes to the `.vscode/confluence-instances.json` file.
    *   Provides a user interface for adding, editing, and removing instances through the VS Code command palette.

*   **`confluence-instances.json` (`.vscode/confluence-instances.json`):**
    *   A JSON file that stores an array of Confluence instance configurations.
    *   Each instance has a `name`, `baseUrl`, and an optional `patPageUrl`.

*   **`ConfluenceService` (`src/tools/confluence/confluenceService.ts`):**
    *   Handles all interactions with the Confluence API.
    *   Manages PATs for each instance using the VS Code `secrets` API for secure storage.
    *   Provides methods for fetching page content, validating authentication, and more.

*   **`ConfluenceChatParticipant` (`src/tools/confluence/chatParticipant.ts`):**
    *   Implements the chat-based interaction logic.
    *   Handles slash commands (e.g., `/load`, `/set_pat`).
    *   Processes user questions by fetching context from Confluence pages and sending it to the LLM.

*   **`ConfluenceCommands` (`src/tools/confluence/commands.ts`):**
    *   Registers and implements the VS Code commands that appear in the command palette.
    *   Commands include "Confluence: Chat with Page", "Confluence: Test Connection", and "Confluence: Configure".

### Data Flow

1.  **Configuration:** The `ConfluenceConfigManager` reads the list of instances from `.vscode/confluence-instances.json`.
2.  **Authentication:** When a user interacts with an instance for the first time, the `ConfluenceService` prompts for a PAT, which is then stored securely.
3.  **Chat Interaction:**
    *   The user invokes a Confluence-related command or asks a question in the chat.
    *   The `ConfluenceChatParticipant` identifies the user's intent.
    *   If the user asks a question about a page, the `ConfluenceService` fetches the page content.
    *   The content is processed and included as context in a request to the LLM.
    *   The LLM's response is streamed back to the user in the chat.

## 3. Configuration

To use the Confluence Chat function, you need to configure your Confluence instances.

### Step-by-Step Configuration

1.  **Open the Command Palette:** Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows).
2.  **Run the Configure Command:** Type "Confluence: Configure" and press Enter.
3.  **Add a New Instance:**
    *   Select "$(add) Add New Instance" from the quick pick menu.
    *   Enter a unique name for your instance (e.g., "Work Confluence").
    *   Enter the base URL of your Confluence instance (e.g., "https://your-company.atlassian.net").
    *   Optionally, enter the URL for generating a PAT.
4.  **Verify Configuration:** A file named `confluence-instances.json` will be created in your `.vscode` directory with the instance you just added. You can manually edit this file to add more instances.

**Example `confluence-instances.json`:**

```json
[
    {
        "name": "Work Confluence",
        "baseUrl": "https://your-company.atlassian.net",
        "patPageUrl": "https://your-company.atlassian.net/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens"
    },
    {
        "name": "Personal Confluence",
        "baseUrl": "https://personal-space.atlassian.net",
        "patPageUrl": "https://personal-space.atlassian.net/secure/ViewProfile.jspa?selectedTab=com.atlassian.pats.pats-plugin:jira-user-personal-access-tokens"
    }
]
```

## 4. User Guide

### Chatting with a Confluence Page

1.  **Open the Command Palette:** Press `Cmd+Shift+P`.
2.  **Select "Confluence: Chat with Page":** Type "Confluence: Chat with Page" and press Enter.
3.  **Choose an Instance:** If you have multiple instances configured, you will be prompted to select one.
4.  **Enter the Page URL:** Paste the URL of the Confluence page you want to chat with.
5.  **Set PAT (if needed):** If you haven't set a PAT for this instance, you will be prompted to enter one.
6.  **Start Chatting:** The content of the page will be loaded into the chat context. You can now ask questions about the page.

### Available Chat Commands

You can use the following slash commands in the chat window to interact with the Confluence integration:

*   `/load <URL>`: Loads the content of a Confluence page into the chat context.
*   `/refresh`: Reloads the content of the current page.
*   `/clear`: Clears the current Confluence context from the chat.
*   `/info`: Displays information about the currently loaded page.
*   `/set_pat`: Prompts you to set or update your Personal Access Token for a specific instance.
*   `/clear_pat`: Clears your stored PAT for a specific instance.
*   `/check_auth`: Checks if your PAT is valid for a specific instance.
*   `/generate_pat_url`: Opens the PAT generation page for a specific instance in your browser.

This concludes the design and user guide for the Confluence Chat function.