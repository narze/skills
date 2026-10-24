# AGENTS.md

This repo holds agent skills, one directory per skill under `skills/` (work-in-progress skills live under `skills/in-progress/`).

## Adding a new skill

Every new skill must ship with its metadata. Do this automatically whenever you add a skill, without being asked.

1. In `<skill>/SKILL.md` frontmatter, include `name`, `description`, and `disable-model-invocation: true`:

   ```yaml
   ---
   name: my-skill
   description: What it does and when to use it.
   disable-model-invocation: true
   ---
   ```

2. Create `<skill>/agents/openai.yaml` with the display name, a short description, and implicit invocation turned off:

   ```yaml
   interface:
     display_name: "My Skill"
     short_description: "Short, human-readable summary"
   policy:
     allow_implicit_invocation: false
   ```

`disable-model-invocation: true` (Claude Code) and `allow_implicit_invocation: false` (Codex/OpenAI) keep skills opt-in: they run only when the user invokes them explicitly. Keep the two settings in sync, and keep `name` equal to the skill's directory name.
