# 🤖 **AI-code-review**

✨ *Your AI-powered GitHub Code Reviewer using GPT-4.* ✨

---

### 🚀 Features at a Glance

| Feature                  | Description                                                                 |
|--------------------------|-----------------------------------------------------------------------------|
| 🧠 AI Review Comments     | Context-aware inline feedback using GPT-4                                  |
| 🚫 File Exclusion         | Skip reviewing files via glob patterns (`*.json`, `dist/**`, etc.)         |
| ⚙️ GitHub Actions Ready   | Plug-and-play with a single workflow file                                   |
| 📦 Lightweight           | No dependencies or build setup required to use                             |

---

### 🔄 How It Works

```text
📤 Pull Request created or updated
      ↓
🤖 GitHub Action triggers CodeSense AI
      ↓
🧾 PR diff & metadata parsed (title, description, file changes)
      ↓
🧠 Prompt sent to OpenAI GPT-4
      ↓
💬 Inline review comments returned & published
```

---

### 🧾 Example Review Output

```json
{
  "reviews": [
    {
      "lineNumber": 42,
      "reviewComment": "Consider renaming this variable for clarity and consistency with naming conventions."
    },
    {
      "lineNumber": 87,
      "reviewComment": "This logic could be abstracted into a separate function to improve readability."
    }
  ]
}
```

---

### 📘 About

**CodeSense AI** is a GitHub Action that automates your pull request reviews using the power of GPT-4.  
It reads your code, understands your intent, and provides focused suggestions — just like a human reviewer, but 24/7 and 10x faster.

---

🔧 Built for teams that care about **code quality** and **developer velocity**.  
🎉 Let AI do the grunt work — you focus on writing great software.
