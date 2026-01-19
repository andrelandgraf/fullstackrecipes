---
name: integration-tests
description: Test API routes by importing handlers directly with Bun's test runner. Fast, reliable tests without HTTP overhead.
---

# Integration Tests

To set up Integration Tests, fetch the recipe from the fullstackrecipes MCP server:

**Resource URI:** `recipe://fullstackrecipes.com/integration-tests`

If the MCP server is not configured, fetch the recipe directly:

```bash
curl -H "Accept: text/plain" https://fullstackrecipes.com/api/recipes/integration-tests
```
