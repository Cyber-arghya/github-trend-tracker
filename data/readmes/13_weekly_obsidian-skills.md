# obsidianmd/obsidian-skills
**Language:** Shell | **Rank:** 13 | **Total Stars:** 54,120
**URL:** https://github.com/obsidianmd/obsidian-skills

Agent Skills for use with Obsidian.

These skills follow the [Agent Skills specification](https://agentskills.io/specification), so they work with any agent that supports skills, including Claude Code, Claude, ChatGPT, Antigravity, Cursor, GitHub Copilot, Grok Bot, Hermes Agent, Kiro, Muse, OpenCode, and [many more](https://agentskills.io/clients).

## Installation

Obsidian is an official plugin for Claude, ChatGPT, Dots, Cursor, Grok Bot, Hermes, and Kiro. Most other agents can install the skills from GitHub.

### Claude

Add [Obsidian](https://claude.ai/customize/plugins/id/a38fa062-ebd3-48e0-9a0a-1875a6e94ad5%40anthropic-plugin-directory) from the official Claude plugin directory.

For the Claude Code CLI use:

```sh
claude plugin marketplace add obsidianmd/obsidian-skills
claude plugin install obsidian@obsidian-skills
```

From within a Claude Code session:

```sh
/plugin marketplace add obsidianmd/obsidian-skills
/plugin install obsidian@obsidian-skills
```

To get new skills later, run `claude plugin update obsidian@obsidian-skills`.

### ChatGPT

Add [Obsidian](https://chatgpt.com/plugins/plugins_6aee4fde227881919d61b034b1c31096) from the ChatGPT plugin directory. The plugin works in ChatGPT, Codex, and Dots.

To install from this repo instead:

```sh
codex plugin marketplace add obsidianmd/obsidian-skills
```

Then install Obsidian from the plugin directory in Codex or the ChatGPT desktop app.

### Antigravity

In the Antigravity CLI, run:

```sh
agy plugin install https://github.com/obsidianmd/obsidian-skills
```

### Grok Bot

Open [Obsidian for Grok Bot](https://x.ai/bot/plugin/88871845) and select **Add to Grok Bot**.

### Muse

Ask Muse to install the skills from https://github.com/obsidianmd/obsidian-skills.

Muse runs in Meta's cloud, so the `obsidian-cli` skill doesn't work there. If you use Obsidian Headless in Muse, you sign in and sync your vault in Meta's cloud.

### Cursor

Install [Obsidian](https://cursor.com/marketplace/obsidian) from the Cursor Marketplace.

### Hermes Agent

Install [Obsidian](https://hermes-agent.nousresearch.com/marketplace/obsidian) from the Hermes Marketplace, or run:

```sh
hermes plugins install obsidian
```

### Kiro

```sh
kiro-cli powers install obsidian
```

### GitHub Copilot, OpenCode, and other agents

Install with [npx skills](https://github.com/vercel-labs/skills), which asks which agents to install into:

```sh
npx skills add https://github.com/obsidianmd/obsidian-skills
```

To install by hand, copy the folders in `plugins/obsidian/skills/` into your agent's skills folder, e.g. `~/.copilot/skills/` for GitHub Copilot.

## Release maintenance

Update the plugin version in every manifest with:

```sh
./scripts/bump.sh patch
```

The script also accepts `major`, `minor`, or an explicit version like `1.1.0`.

Gemini CLI installs from the latest GitHub release, so publish a release for each version, tagged with the version number. The `Gemini release archive` workflow then attaches `obsidian-gemini.tar.gz`, which has real copies of the skills. Don't attach other files to a release, because Gemini CLI only picks a file when there's exactly one; otherwise it falls back to the source archive, which has no Gemini manifest. To build the archive locally, run `./scripts/package-gemini.sh`.

## Skills

| Skill                                                          | Description                                                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [obsidian-markdown](plugins/obsidian/skills/obsidian-markdown) | Create and edit [Obsidian Flavored Markdown](https://help.obsidian.md/obsidian-flavored-markdown) (`.md`) with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax |
| [obsidian-bases](plugins/obsidian/skills/obsidian-bases)       | Create and edit [Obsidian Bases](https://help.obsidian.md/bases/syntax) (`.base`) with views, filters, formulas, and summaries                                                             |
| [json-canvas](plugins/obsidian/skills/json-canvas)             | Create and edit [JSON Canvas](https://jsoncanvas.org/) files (`.canvas`) with nodes, edges, groups, and connections                                                                        |
| [obsidian-cli](plugins/obsidian/skills/obsidian-cli)           | Interact with Obsidian vaults via the [Obsidian CLI](https://help.obsidian.md/cli) including plugin and theme development                                                                  |
| [obsidian-headless](plugins/obsidian/skills/obsidian-headless) | Sync and publish vaults from the command line with [Obsidian Headless](https://help.obsidian.md/headless), without the desktop app                                                         |
| [defuddle](plugins/obsidian/skills/defuddle)                   | Extract clean markdown from web pages using [Defuddle](https://github.com/kepano/defuddle), removing clutter to save tokens                                                                |
| [knap](plugins/obsidian/skills/knap)                           | Render Markdown templates from JSON or CSV data using [Knap](https://github.com/obsidianmd/knap), including batch file generation                                                          |
