Of course. This is an excellent use case for AI-assisted development tools. A well-crafted prompt template will ensure you get consistent, high-quality documentation across different projects.

The key is to create a prompt that is not only a set of instructions but also a **structural skeleton** for the final document. The AI will use your instructions to analyze the codebase and then fill in the skeleton you provide.

Here is a comprehensive template prompt designed for your needs.
Google 2.5 Pro
***

### **How to Use This Template**

1.  **Open your project** in the AI-assisted IDE (like Cursor or VS Code with Copilot). Ensure the AI has access to the full project context (all files are indexed/visible).
2.  **Open a new chat or prompt window** with the AI.
3.  **Copy and paste** the entire template below into the chat.
4.  **Replace the placeholder `[Project Name]`** with the actual name of your project. You can also add any other specific questions or context at the very top.
5.  **Send the prompt** and let the AI generate the documentation. The AI will use its understanding of the open codebase to fill in the details.

***

### **Universal Project Documentation Prompt Template for AI Dev Tools**

```prompt
# Prompt for AI: Generate Comprehensive Project Documentation

**Objective:**
You are an expert technical writer and senior software architect. Your task is to generate a comprehensive, detailed, and well-structured technical onboarding document for a new developer joining the team for the project named **"[Project Name]"**.

**Crucial Instruction:**
You have access to the entire codebase of this project. You MUST meticulously analyze the code, configuration files, directory structure, and any existing documentation (like READMEs) to generate accurate, specific, and insightful content for each section below. Do not provide generic or placeholder answers; base your output directly on the provided project context.

**Output Format:**
The final output MUST be a single, well-structured Markdown file. Use clear headings, bullet points, and code blocks for readability. Where diagrams are requested, generate them in a text-based format like Mermaid or PlantUML, enclosed in a code block.

---

# Project Onboarding & Technical Overview: [Project Name]

## 1. Executive Summary & Business Context

### 1.1. The Problem We Solve
Based on the codebase and any available context, describe the core business problem this system was built to solve. What is the primary pain point it addresses for its users?

### 1.2. Core Business Objective
What is the primary goal of this application? (e.g., "To automate customer invoicing," "To provide a real-time analytics dashboard for sales data," "To manage e-commerce inventory.")

### 1.3. Target Users
Who are the primary users of this system? (e.g., "Internal finance team," "External B2B customers," "Platform administrators.")

## 2. System Architecture & Design

### 2.1. High-Level Architecture Overview
Provide a concise, high-level description of the system's architecture. Is it a Monolith, Microservices, Serverless, etc.? Describe the main moving parts and how they interact.

### 2.2. Architectural Diagram (Mermaid)
Generate a component or sequence diagram using Mermaid syntax that visually represents the architecture described above. Show the key components (e.g., Web UI, API Gateway, Services, Database, Message Queue) and the flow of data/requests for a primary use case.

### 2.3. Key Components & Responsibilities
Analyze the project's directory structure and code. List the key modules, services, or components and describe the specific responsibility of each.

*   **Component A (e.g., `src/api`):** [Describe its purpose, e.g., "Handles all incoming HTTP requests, performs validation, and routes to the appropriate service."]
*   **Component B (e.g., `src/services`):** [Describe its purpose, e.g., "Contains the core business logic. It orchestrates data from various sources and performs calculations."]
*   **Component C (e.g., `src/data`):** [Describe its purpose, e.g., "Manages data persistence and communication with the database."]
*   ... (continue for all major components)

### 2.4. Data Model & Persistence
Describe the primary data storage solution (e.g., PostgreSQL, MongoDB, Redis). Mention the ORM or library used (e.g., Prisma, TypeORM, SQLAlchemy). Identify and list the most critical data models/tables and their purpose.

## 3. Technical Stack & Specifications

### 3.1. Core Technologies & Frameworks
Scan files like `package.json`, `pom.xml`, `requirements.txt`, `go.mod`, etc., to create a detailed list of the core technology stack.

*   **Language(s):** [e.g., TypeScript, Python, Java]
*   **Backend Framework:** [e.g., Node.js with Express, Django, Spring Boot]
*   **Frontend Framework:** [e.g., React, Vue, Angular]
*   **Database:** [e.g., PostgreSQL, MongoDB]
*   **Key Libraries/Dependencies:** [List 5-10 of the most important libraries and their purpose, e.g., "Axios for HTTP requests," "Jest for testing," "Pandas for data manipulation."]

### 3.2. Infrastructure & Deployment
Analyze configuration files (`Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `serverless.yml`, `terraform/`) to describe the infrastructure and CI/CD process.

*   **Hosting Environment:** [e.g., AWS, GCP, Azure, On-premise]
*   **Containerization:** [e.g., Docker, Kubernetes]
*   **CI/CD Pipeline:** [e.g., GitHub Actions, Jenkins, GitLab CI. Describe the main stages: build, test, deploy.]

### 3.3. APIs & Integrations
Identify how the system communicates with the outside world.

*   **Internal APIs:** List the main internal API endpoints and their purpose.
*   **External Service Integrations:** List any third-party services this application integrates with (e.g., Stripe for payments, Twilio for SMS, Sentry for error tracking).

## 4. Developer Onboarding & Workflows

### 4.1. Local Development Setup
Based on the `README.md`, package manager files, and setup scripts, provide a step-by-step guide for a new developer to get the project running on their local machine.

1.  **Prerequisites:** [e.g., Node.js v18, Python 3.10, Docker]
2.  **Clone Repository:** `git clone ...`
3.  **Install Dependencies:** [e.g., `npm install`]
4.  **Environment Variables:** Explain how to set up the `.env` file and list the critical variables needed.
5.  **Run Application:** [e.g., `npm run dev`]
6.  **Run Tests:** [e.g., `npm test`]

### 4.2. Code Structure & Key Directories
Provide a brief overview of the project's directory structure, highlighting the most important folders.

*   `/src`: [Main source code]
*   `/src/components`: [Reusable UI components]
*   `/src/controllers`: [API route handlers]
*   `/tests`: [Location of all tests]
*   ... (and so on)

### 4.3. Common Development Workflows
Describe the typical process for common tasks.

*   **Branching Strategy:** [e.g., GitFlow, Trunk-based. How are branches named?]
*   **Adding a New Feature:** [e.g., "1. Create a feature branch... 2. Add controller, service, and tests... 3. Open a Pull Request..."]
*   **Code Style & Linting:** [Identify the linting tools (e.g., ESLint, Prettier) and how to run them.]

## 5. System Workflows & Business Processes

### 5.1. Critical User Journeys
Trace the code for 1-2 critical business workflows and describe them step-by-step from the user's perspective, mentioning the key functions or components involved.
*   **Example (User Registration):** "1. User submits data to the `/api/register` endpoint. 2. The `authController` handles the request. 3. The `userService` validates the data and hashes the password. 4. The `userRepository` saves the new user to the database..."

### 5.2. Key Automated Processes
Identify any background jobs, cron jobs, or event-driven processes.
*   **Example:** "A cron job defined in `src/jobs/nightly-sync.js` runs every midnight to synchronize data from the external CRM."

## 6. Known Issues, Technical Debt, & Future Improvements

### 6.1. Potential Problems & Limitations
Analyze the code for potential issues like lack of error handling, performance bottlenecks, or security vulnerabilities. Scan the code for comments like `// TODO:`, `// FIXME:`, or `// HACK:` and list them here with context.

### 6.2. Areas for Improvement
Based on your analysis, suggest 3-5 specific, actionable areas for improvement.

*   **Refactoring:** [e.g., "The `processOrder` function in `OrderService.js` is over 300 lines long and could be refactored into smaller, more manageable units."]
*   **Testing:** [e.g., "Code coverage for the `payment` module is low. More integration tests should be added."]
*   **Dependencies:** [e.g., "The project uses several outdated libraries with known security vulnerabilities that should be updated."]

```
