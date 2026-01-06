# AI Agent Instructions for SAP CAP Development

## ✅ Golden Rules

1. **ALWAYS consult official CAP docs** via the MCP **sap-docs** server **before** answering any CAP-related question or writing code.
2. **NEVER rely only on training data** for CAP APIs, patterns, or best practices.
3. **FOR EVERY CAP TASK**, first call:

   - `mcp_sap-docs_search`
   - or `mcp_sap-docs_fetch`

## 📚 What to Read First (via MCP)

Use the MCP tools to fetch these in order:

1. **CAP Best Practices** – `/cap/about/best-practices`

   - Service-centric design
   - Events & handlers (`before/on/after`)
   - CDS domain models & CQL/CQN
   - Hexagonal architecture & agnostic design

2. **CAP Bad Practices / Anti-Patterns** – `/cap/about/bad-practices`

   - No DAOs, DTOs, Active Record
   - No ORMs (TypeORM, Sequelize, etc.)
   - No “microservice mania” or extra abstraction layers

3. **Node.js Best Practices** – `/cap/node.js/best-practices`

   - `^` versions for dependencies
   - Security (CSRF, CORS, CSP, helmet)
   - Error handling (“let it crash” for unexpected errors)
   - Transactions and timestamps

## 🎯 Core CAP Best Practices

- **Service-Centric**

  - Everything is a **service**.
  - Use **event handlers** (`before / on / after`) instead of class methods.

- **Passive Data**

  - Use **plain objects** only.
  - No DAOs, DTOs, Active Record, or “rich” entities.

- **Querying over CRUD**

  - Use **CQL/CQN** for all data access.
  - Don’t use ORMs or direct DB frameworks.

- **Agnostic by Design**

  - Stay agnostic to protocol, DB, and platform.
  - Use CAP’s adapters instead of bypassing them.

## ❌ Never Do This

- No DAOs, DTOs, Active Record.
- No ORMs (TypeORM, Sequelize, etc.).
- No Spring/JPA-style repositories.
- No direct HTTP/OData to bypass CAP.
- No “generic database services” that wrap CAP.
- No premature microservices splitting.
- No custom code generators for CAP services.

## 🔍 MCP Tool Usage (Mandatory)

Before giving any CAP-related answer, you MUST do at least one of:

```javascript
// Search CAP docs (best practices, APIs, guides)
mcp_sap - docs_search({ query: "CAP best practices services events" });

// Fetch specific CAP doc
mcp_sap - docs_fetch({ id: "/cap/about/best-practices" });

// Check anti-patterns
mcp_sap - docs_search({ query: "CAP anti-patterns bad practices" });
```

For troubleshooting via SAP Community:

```javascript
mcp_sap -
  docs_sap_community_search({
    query: "CAP error code 415 action parameter",
  });
```

## ✔ Quick Checklist Before Responding

- [ ] Did I use `mcp_sap-docs_search` or `mcp_sap-docs_fetch`?
- [ ] Does my answer follow **service-centric** CAP design?
- [ ] Are data structures **passive** (plain objects)?
- [ ] Is logic in **event handlers**, not methods on entities?
- [ ] Am I using **CQL/CQN**, not ORM/SQL frameworks?
- [ ] Have I avoided all listed **anti-patterns**?
- [ ] Are Node.js dependencies using **caret `^` versions**?
- [ ] Did I consider **security** (CSRF, CORS, CSP, helmet)?
- [ ] Am I letting unexpected errors **crash** instead of swallowing them?
