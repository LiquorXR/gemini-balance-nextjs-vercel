# Gemini Balance - Next.js Edition

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjonthanliu%2Fgemini-balance-nextjs"><img src="https://vercel.com/button" alt="Deploy with Vercel"/></a>
  <a href="https://trendshift.io/repositories/13692" target="_blank"><img src="https://trendshift.io/api/badge/repositories/13692" alt="snailyp%2Fgemini-balance | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-14%2B-blue.svg" alt="Next.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5%2B-green.svg" alt="TypeScript"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind%20CSS-3%2B-purple.svg" alt="Tailwind CSS"></a>
  <a href="https://t.me/+soaHax5lyI0wZDVl"><img src="https://img.shields.io/badge/Telegram-Group-blue.svg?logo=telegram" alt="Telegram Group"></a>
</p>

> ⚠️ **Important Notes**:
>
> - **Origin & Acknowledgment**: This project is a Next.js implementation of the original Python project [gemini-balance](https://github.com/snailyp/gemini-balance). Special thanks to the original author for the inspiration.
> - **AI-Generated**: With the exception of this notice, all code and documentation in this project were written by Google's Gemini model.
> - **Contributions**: Pull requests are welcome! Please note that PRs will also be reviewed and managed by an AI.

---

## 📖 Project Introduction

This project is a high-performance, feature-rich Next.js implementation of the `gemini-balance` Python project. It functions as an intelligent AI gateway, receiving requests through multiple API formats (including OpenAI-compatible) and routing them to Google's Gemini models.

This version goes beyond a simple proxy, offering a robust feature set including a management dashboard, persistent configuration, and advanced authentication, making it a powerful and flexible solution for developers.

---

## ✨ Feature Highlights

- **Multi-Key Load Balancing**: Supports configuring multiple Gemini API Keys for automatic sequential polling.
- **Visual Configuration**: Configurations modified through the admin backend take effect immediately without restarting.
- **Dual Protocol API Compatibility**: Supports both Gemini and OpenAI CHAT API formats.
- **Key Status Monitoring**: Provides a dashboard for real-time monitoring.
- **Detailed Logging**: Provides detailed error logs for easy troubleshooting.
- **Failure Retry & Auto-Disable**: Automatically retries failed API requests and disables keys after excessive failures.
- **Automatic Key Recovery**: Automatically recovers disabled keys through a daily cron job.
- **Proxy Support**: Supports HTTP/SOCKS5 proxies.
- **Docker Support**: Provides a Docker image for easy self-hosting.

---

## 🚀 Deployment

### Option 1: Vercel (Recommended)

1.  Click the "Deploy with Vercel" button at the top of this README.
2.  Follow the on-screen instructions to create a new project.
3.  Add a Vercel Postgres database and connect it to your project.
4.  Set the `DATABASE_URL` environment variable to the one provided by Vercel Postgres.
5.  Deploy!

### Option 3: Self-Hosted with Docker

This project can be deployed to any server with Docker and Docker Compose installed.

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/jonthanliu/gemini-balance-nextjs.git
    cd gemini-balance-nextjs
    ```
2.  **Prepare `.env` file**:
    Create a `.env` file and add the following:
    ```
    DATABASE_URL="postgresql://postgres:postgres@db:5432/gemini_balance"
    ```
3.  **Build and run the container**:
    ```bash
    docker-compose up -d --build
    ```
4.  **Perform First-Time Setup**: Follow the same "First-Time Setup via Web UI" steps as in the local development guide, but access the application at the server's IP address (e.g., `http://YOUR_SERVER_IP:3000`). You will need to provide your own Gemini API keys during the setup process.

---

## 💻 Local Development

1.  **Clone and Install**:
    ```bash
    git clone https://github.com/jonthanliu/gemini-balance-nextjs.git
    cd gemini-balance-nextjs
    pnpm install
    ```
2.  **Configure Environment**:
    Create a `.env` file and add your Postgres connection string. This can be a local database or a remote one from a provider like Supabase, Neon, etc.
    ````
    DATABASE_URL="your_postgres_connection_string"
    ```>>>>>>> REPLACE
    ````
3.  **Initialize the Database**:
    ```bash
    pnpm drizzle-kit push
    ```
4.  **Start Application**:
    ```bash
    pnpm dev
    ```
    Access the application at `http://localhost:3000`.

---

## ⚙️ API Endpoints

### Gemini API Format (`/gemini/v1beta`)

- `GET /models`: List available Gemini models.
- `POST /models/{model_name}:generateContent`: Generate content.
- `POST /models/{model_name}:streamGenerateContent`: Stream content generation.

### OpenAI API Format (`/v1`)

- `GET /v1/models`: List models.
- `POST /v1/chat/completions`: Chat completion.
- `POST /v1/embeddings`: Create text embeddings.

---

## 🤝 Contributing

Pull Requests or Issues are welcome.

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=jonthanliu/gemini-balance-nextjs&type=Date)](https://star-history.com/#jonthanliu/gemini-balance-nextjs&Date)

## License

This project is licensed under the MIT License.
