# DeepResearch: AI-Powered Research Assistant (Fork)

An AI-powered research assistant that performs iterative, deep research on any topic by combining web scraping, search engines, and large language models. This project is a modified combination of the original [`dzhng/deep-research`](https://github.com/dzhng/deep-research) and [`mendableai/firecrawl`](https://github.com/mendableai/firecrawl) repositories, incorporating enhanced capabilities for data acquisition and language model integration. **This setup allows for a completely free research workflow by running Firecrawl locally and using free models available through OpenRouter.**

## Purpose

The main goal of this project is to provide a robust and flexible tool for conducting in-depth research automatically, **without incurring costs**.

## How it Works

This project operates with two primary components:

1.  **Firecrawl (Modified):** Handles the web scraping and data acquisition. It fetches content from specified URLs and provides clean, structured data. This version has been modified to potentially use the Brave API for web requests and **is designed to be run locally using Docker for a free solution.** (The brave API provides 2000 queries/month free of charge).
2.  **Deep-Research (Modified):** Acts as the research engine. It uses the data provided by Firecrawl, generates further search queries, and utilizes large language models (configured to use OpenRouter in this version). **By using OpenRouter, you gain access to free models, making the LLM part of the workflow cost-free.** It processes information, refines research directions, and generates comprehensive reports.

The process is iterative: Deep-research directs Firecrawl to gather data, analyzes the results with LLMs, identifies new research questions, and repeats the cycle based on configured depth and breadth parameters.

## Key Features

*   **Iterative Research:** Conducts research in multiple passes, refining queries based on previous findings.
*   **Intelligent Query Generation:** Leverages LLMs to create effective search queries.
*   **Depth & Breadth Control:** Customize the scope and depth of the research process.
*   **Comprehensive Reports:** Generates detailed markdown reports summarizing findings and sources.
*   **Enhanced LLM Support:** Integrated with OpenRouter for flexible access to a variety of language models, **including free options.**
*   **Flexible Web Data Source:** Modified Firecrawl component can utilize alternative APIs like Brave API for web content, **and can be run locally at no cost.**

## Requirements

*   Node.js environment
*   Docker and Docker Compose (essential for running local Firecrawl)
*   API keys for:
    *   Brave API (if configured in Firecrawl, costs may apply depending on Brave's terms, **free tier includes 1 query/second and up to 2,000 queries/month**).
    *   OpenRouter API (needed to access models, **use a free model to avoid costs**).

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd DeepResearch
    ```
2.  **Set up Firecrawl (Local):**
    *   Navigate to the `firecrawl/apps/api` directory:
        ```bash
        cd firecrawl/apps/api
        ```
    *   Copy the environment example file:
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and set your Brave API key:
        ```dotenv
        BRAVE_API_KEY="YOUR-KEY"
        # Ensure other required variables like REDIS_URL are set correctly, potentially pointing to the service name in docker-compose (e.g., redis:6379)
        ```
    *   Navigate back to the root `firecrawl` directory:
        ```bash
        cd ../..
        ```
    *   Run Firecrawl using Docker Compose:
        ```bash
        docker compose up 
        ```
        (Use `docker compose down` to stop the containers later)
3.  **Set up Deep-Research:**
    *   Navigate to the `deep-research` directory:
        ```bash
        cd ../deep-research
        ```
    *   Install Node.js dependencies:
        ```bash
        npm install
        ```
    *   Create a `.env.local` file in the `deep-research` directory and add your API keys and Firecrawl endpoint:
        ```dotenv
        FIRECRAWL_BASE_URL="http://localhost:3002"
        OPENROUTER_KEY="YOUR-KEY"
        OPENROUTER_ENDPOINT="https://openrouter.ai/api/v1"
        OPENROUTER_MODEL="google/gemma-3-27b-it:free"
        ```

## Usage

1.  Ensure your local Firecrawl Docker containers are running (`docker compose up -d` in the `firecrawl` directory).
2.  Navigate to the `deep-research` directory in your terminal.
3.  Run the research assistant:
    ```bash
    npm start
    ```

    For example, you could use the following query:
    "I would like to research about mcp. Where did it start, what it entails, why is it used, what are its benefits, disadvantages, when to use it and when to not use it." Which was the query used to generate the report currently present in the output file.

4.  Follow the prompts to enter your research query and parameters.

The final report will be saved as `output.md` in the `deep-research` directory.

## Project Structure

*   `deep-research/`: Contains the core research assistant application.
*   `firecrawl/`: Contains the modified Firecrawl web scraping service.

## Attribution

This project is a fork based on the excellent work from:

*   `dzhng/deep-research` ([https://github.com/dzhng/deep-research](https://github.com/dzhng/deep-research))
*   `mendableai/firecrawl` ([https://github.com/mendableai/firecrawl](https://github.com/mendableai/firecrawl))

Modifications include integration with OpenRouter for LLM calls in `deep-research` and potential integration with Brave API for web requests in `firecrawl`.

## License

[Include license information, likely inherited from the original projects, e.g., MIT] 