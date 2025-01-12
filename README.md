# 🤖 **AI Code Reviewer**

✨ *Automate your PR reviews with GPT-4 magic!* ✨

---

### 🚀 Features
- 🧠 Smart AI feedback on your code  
- 🚫 Filters files you don’t want reviewed  
- ⚙️ Easy GitHub Actions setup  

---

### ⚙️ Setup

1️⃣ Add your **OpenAI API key** as a secret named `OPENAI_API_KEY`  
2️⃣ Create `.github/workflows/main.yml` with:

```yaml
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ashkaaar/AI-code-review@main
        with:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

🚀 **Start getting AI-powered reviews today!**  
Happy coding! 🎉
