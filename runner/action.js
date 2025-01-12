const fs = require("fs");
const core = require("@actions/core");
const OpenAI = require("openai");
const { Octokit } = require("@octokit/rest");
const parseDiff = require("parse-diff");
const minimatch = require("minimatch");

const githubToken = core.getInput("GITHUB_TOKEN");
const openaiApiKey = core.getInput("OPENAI_API_KEY");
const openaiModel = core.getInput("OPENAI_API_MODEL");

const octokit = new Octokit({ auth: githubToken });
const openai = new OpenAI.OpenAI({ apiKey: openaiApiKey });

async function fetchPullRequestInfo() {
  const eventPayload = JSON.parse(
    fs.readFileSync(process.env.GITHUB_EVENT_PATH || "", "utf-8")
  );
  const { repository, number } = eventPayload;
  const prData = await octokit.pulls.get({
    owner: repository.owner.login,
    repo: repository.name,
    pull_number: number,
  });
  return {
    owner: repository.owner.login,
    repo: repository.name,
    number,
    title: prData.data.title || "",
    body: prData.data.body || "",
  };
}

async function fetchPullRequestDiff(owner, repo, pullNumber) {
  const resp = await octokit.request(
    "GET /repos/{owner}/{repo}/pulls/{pull_number}",
    {
      owner,
      repo,
      pull_number: pullNumber,
      headers: { accept: "application/vnd.github.v3.diff" },
    }
  );
  return typeof resp.data === "string" ? resp.data : null;
}

function buildPrompt(file, chunk, prInfo) {
  return `
You are a code review bot.

- Respond with JSON: {"reviews": [{"lineNumber": <line>, "reviewComment": "<comment>"}]}
- Only comment if there is room for improvement; otherwise, reviews is an empty array.
- No compliments or positive feedback.
- Use GitHub Markdown.
- Use PR title and description as context.
- Do NOT suggest adding comments to the code.

PR Title: ${prInfo.title}
PR Description:

---
${prInfo.body}
---

Diff of file "${file.to}":

\`\`\`diff
${chunk.content}
${chunk.changes
  .map((c) => `${c.ln ?? c.ln2} ${c.content}`)
  .join("\n")}
\`\`\`
`.trim();
}

async function queryOpenAI(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: openaiModel,
      temperature: 0.2,
      max_tokens: 700,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      ...(openaiModel === "gpt-4-1106-preview"
        ? { response_format: { type: "json_object" } }
        : {}),
      messages: [{ role: "system", content: prompt }],
    });

    const content = completion.choices[0].message?.content?.trim() || "{}";
    return JSON.parse(content).reviews;
  } catch (e) {
    console.error("OpenAI query failed:", e);
    return null;
  }
}

function extractComments(file, aiReviews) {
  return aiReviews.map(({ lineNumber, reviewComment }) => ({
    path: file.to || "",
    line: Number(lineNumber),
    body: reviewComment,
  }));
}

async function submitReview(owner, repo, pullNumber, comments) {
  if (comments.length === 0) return;
  await octokit.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    comments,
    event: "COMMENT",
  });
}

async function analyzeDiff(files, prInfo) {
  const allComments = [];

  for (const file of files) {
    if (file.to === "/dev/null") continue;

    for (const chunk of file.chunks) {
      const prompt = buildPrompt(file, chunk, prInfo);
      const reviews = await queryOpenAI(prompt);
      if (reviews && reviews.length) {
        allComments.push(...extractComments(file, reviews));
      }
    }
  }

  return allComments;
}

async function run() {
  const prInfo = await fetchPullRequestInfo();
  const eventPayload = JSON.parse(
    fs.readFileSync(process.env.GITHUB_EVENT_PATH || "", "utf-8")
  );

  let diffText = null;

  if (eventPayload.action === "opened") {
    diffText = await fetchPullRequestDiff(prInfo.owner, prInfo.repo, prInfo.number);
  } else if (eventPayload.action === "synchronize") {
    const { before, after } = eventPayload;
    const comparison = await octokit.repos.compareCommits({
      owner: prInfo.owner,
      repo: prInfo.repo,
      base: before,
      head: after,
      headers: { accept: "application/vnd.github.v3.diff" },
    });
    diffText = typeof comparison.data === "string" ? comparison.data : null;
  } else {
    console.log("Event not supported:", process.env.GITHUB_EVENT_NAME);
    return;
  }

  if (!diffText) {
    console.log("No diff data available.");
    return;
  }

  const parsed = parseDiff(diffText);

  const excludePatterns = core
    .getInput("exclude")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const filteredFiles = parsed.filter(
    (file) => !excludePatterns.some((pattern) => minimatch(file.to || "", pattern))
  );

  const comments = await analyzeDiff(filteredFiles, prInfo);

  if (comments.length > 0) {
    await submitReview(prInfo.owner, prInfo.repo, prInfo.number, comments);
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
