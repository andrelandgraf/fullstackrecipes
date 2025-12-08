## Editor and Linting Setup

We use Prettier for code formatting and TypeScript for typechecking (no linter).

### Step 1: Install Prettier

```bash
bun add -D prettier
```

### Step 2: Add scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "fmt": "prettier --write ."
  }
}
```

### Step 3: Install VSCode Extension

Install the Prettier VSCode extension for automatic formatting:

- [Install in Cursor](cursor:extension/prettier.prettier-vscode)
- Or via VS Code command line: `ext install prettier.prettier-vscode`

### Step 4: Add .vscode Configuration (Recommended)

Create a `.vscode` folder in your project root with the following files:

#### .vscode/extensions.json

Recommend the Prettier extension to all contributors:

```json
{
  // See https://go.microsoft.com/fwlink/?LinkId=827846 to learn about workspace recommendations.
  // Extension identifier format: ${publisher}.${name}. Example: vscode.csharp
  // List of extensions which should be recommended for users of this workspace.
  "recommendations": ["prettier.prettier-vscode"],
  // List of extensions recommended by VS Code that should not be recommended for users of this workspace.
  "unwantedRecommendations": []
}
```

#### .vscode/settings.json

Enable format on save with Prettier as the default formatter:

```json
{
  "editor.formatOnSave": true,
  "[typescript][javascript][html][markdown][css][json][html][typescriptreact][javascriptreact]": {
    "editor.defaultFormatter": "prettier.prettier-vscode"
  }
}
```

### Step 5: Add .editorconfig (Recommended)

Create a `.editorconfig` file in your project root:

```editorconfig
# Editor config
# http://EditorConfig.org

# This EditorConfig overrides any parent EditorConfigs
root = true

# Default rules applied to all file types
[*]

# No trailing spaces, newline at EOF
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

# 2 space indentation
indent_style = space
indent_size = 2

# JavaScript-specific settings
[*.{js,ts}]
quote_type = double
continuation_indent_size = 2
curly_bracket_next_line = false
indent_brace_style = BSD
spaces_around_operators = true
spaces_around_brackets = none
```

---

## References

- [Prettier Documentation](https://prettier.io/docs/en/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [EditorConfig](https://editorconfig.org/)
