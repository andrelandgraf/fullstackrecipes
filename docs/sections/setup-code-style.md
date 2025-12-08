## Editor and Linting Setup

We use Prettier for code formatting and TypeScript for typechecking. We're explicitly not using a linter like ESLint or Biome to avoid config hell.

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

- [Install in Cursor](cursor:extension/esbenp.prettier-vscode)
- Or via VS Code command line: `ext install esbenp.prettier-vscode`

### Step 4: Add .vscode Configuration (Recommended)

Create a `.vscode` folder in your project root with the following files:

#### .vscode/extensions.json

Recommend the Prettier extension to all contributors:

```json
{
  // See https://go.microsoft.com/fwlink/?LinkId=827846 to learn about workspace recommendations.
  // Extension identifier format: ${publisher}.${name}. Example: vscode.csharp
  // List of extensions which should be recommended for users of this workspace.
  "recommendations": ["esbenp.prettier-vscode"],
  // List of extensions recommended by VS Code that should not be recommended for users of this workspace.
  "unwantedRecommendations": []
}
```

#### .vscode/settings.json

Enable format on save with Prettier as the default formatter:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Step 5: Add .editorconfig (Recommended)

Create a `.editorconfig` file in your project root. This is optional as it follows the default Prettier configuration but can be useful for other editors that support it:

```editorconfig
# Editor config - see http://EditorConfig.org

root = true

[*]
charset = utf-8
insert_final_newline = true
end_of_line = lf
indent_style = space
indent_size = 2
max_line_length = 80
```

---

## References

- [Prettier Philosophy](https://prettier.io/docs/option-philosophy)
- [EditorConfig](https://editorconfig.org/)
