---
name: observability-monitoring
description: Complete observability stack with structured logging, error tracking, and web analytics.
---

# Observability & Monitoring

Complete observability stack with structured logging, error tracking, and web analytics.

## Cookbook - Complete These Recipes in Order

### Pino Logging Setup

Configure structured logging with Pino. Outputs human-readable colorized logs in development and structured JSON in production for log aggregation services.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/pino-logging-setup
```

### Sentry Setup

Configure Sentry for error tracking, performance monitoring, and log aggregation. Integrates with Pino to forward logs to Sentry automatically.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/sentry-setup
```

### Vercel Web Analytics

Add privacy-focused web analytics with Vercel Web Analytics. Track page views, visitors, and custom events with zero configuration.

```bash
curl -H "Accept: text/markdown" https://fullstackrecipes.com/api/recipes/vercel-analytics-setup
```

### Working with Logging

Use structured logging with Pino throughout your application. Covers log levels, context, and workflow-safe logging patterns.

```bash
bunx skills add andrelandgraf/fullstackrecipes/skills -s using-logging
```

### Working with Sentry

Capture exceptions, add context, create performance spans, and use structured logging with Sentry.

```bash
bunx skills add andrelandgraf/fullstackrecipes/skills -s using-sentry
```

### Working with Analytics

Track custom events and conversions with Vercel Web Analytics. Covers common events, form tracking, and development testing.

```bash
bunx skills add andrelandgraf/fullstackrecipes/skills -s using-analytics
```
