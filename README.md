<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Habbit-Nested

**Daily decisions maker with unlimited nested subtasks and GitHub sync**

A powerful habit and todo tracker built with React, TypeScript, and Google Gemini AI.

## ✨ Features

- 📝 **Unlimited Nested Subtasks** - Create tasks within tasks, infinitely deep
- 🔄 **GitHub Sync** - Sync your data across browsers and devices using GitHub Gists
- ⏰ **Built-in Pomodoro Timer** - Focus timer for each task
- 🤖 **AI Task Breakdown** - Let Gemini AI break down complex goals into actionable steps
- 🎯 **Habit & Todo Types** - Organize recurring habits and one-time tasks
- 🎨 **Drag & Drop** - Reorder and reorganize tasks easily
- 💾 **Local Storage** - Auto-save locally, sync to cloud when you want
- 🌙 **Dark Theme** - Easy on the eyes Nordic dark theme

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- GitHub Personal Access Token with `gist` permission (for sync feature)
- Gemini API Key (for AI breakdown feature)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/WinterSoldier91/Habbit-Nested.git
   cd Habbit-Nested
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your-gemini-api-key-here
     ```
   - Get your Gemini API key from [AI Studio](https://aistudio.google.com/)

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   - Navigate to `http://localhost:5173`

## 🔄 GitHub Sync Setup

### Why GitHub Sync?
Your tasks are stored locally by default. GitHub sync allows you to:
- ✅ Access your tasks from any browser
- ✅ Keep data synced across multiple devices
- ✅ Have a backup of your tasks on GitHub
- ✅ Control your own data (stored in your private Gist)

### How to Set Up GitHub Sync

1. **Create a GitHub Personal Access Token:**
   - Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens/new)
   - Click "Generate new token (classic)"
   - Give it a descriptive name (e.g., "Habbit-Nested Sync")
   - Select **only** the `gist` permission
   - Click "Generate token"
   - **Copy the token immediately** (you won't see it again!)

2. **Configure Sync in the App:**
   - Click the "GitHub Sync" button in the app
   - Paste your token in the settings panel
   - Click "Verify" to confirm it works
   - Click "Save to GitHub" to create your first sync

3. **Auto-Sync:**
   - Once configured, the app automatically:
     - Loads your latest data when you open it
     - Saves changes to GitHub 2 seconds after you stop editing
   - Manual sync buttons are available in settings for immediate control

### Using Multiple Browsers/Devices

1. Set up the app on each device following the Quick Start steps
2. Use the **same GitHub token** on all devices
3. Click "Load from GitHub" in Settings to get your latest data
4. Your tasks will stay synced automatically!

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS (inline)
- **AI:** Google Generative AI (Gemini)
- **Storage:** LocalStorage + GitHub Gists
- **State Management:** React Hooks

## 📦 Build for Production

```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```

## 🤝 Contributing

Feel free to open issues or submit pull requests!

## 📄 License

MIT License - feel free to use this for your own projects!

## 🔗 Links

- [AI Studio](https://aistudio.google.com/) - Get your Gemini API key
- [GitHub Tokens](https://github.com/settings/tokens) - Create your sync token
- [Repository](https://github.com/WinterSoldier91/Habbit-Nested)

---

**Built with ❤️ using AI Studio and Gemini**
