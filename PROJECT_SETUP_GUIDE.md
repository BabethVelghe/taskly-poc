# CAP Project Setup Guide - Multitenant TypeScript Template

This guide documents the complete setup of a **multitenant SAP CAP application** with TypeScript, allowing you to replicate this architecture for future projects.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Initialization](#project-initialization)
3. [Project Structure](#project-structure)
4. [Configuration Files](#configuration-files)
5. [Database Layer](#database-layer)
6. [Service Layer](#service-layer)
7. [Multitenancy Setup](#multitenancy-setup)
8. [Security Configuration](#security-configuration)
9. [Development Workflow](#development-workflow)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Best Practices Checklist](#best-practices-checklist)

---

## Prerequisites

### Required Software

```bash
# Node.js LTS version (20.x or later)
node --version  # v20.x.x or higher

# npm or pnpm
npm --version   # 9.x.x or higher

# SAP CDS Development Kit
npm install -g @sap/cds-dk

# Cloud Foundry CLI (for deployment)
cf --version

# Optional: SAP Business Application Studio or VS Code with CAP extensions
```

### SAP BTP Requirements (for deployment)

- SAP BTP subaccount with Cloud Foundry environment
- Required entitlements:
  - SAP HANA Cloud (hana)
  - Authorization and Trust Management (xsuaa)
  - SAP SaaS Provisioning (saas-registry)
  - Destination Service (destination)

---

## Project Initialization

### Step 1: Create New CAP Project

```bash
# Create project directory
mkdir my-cap-project
cd my-cap-project

# Initialize CAP project
cds init --add typescript,multitenancy,mta,xsuaa,hana

# This creates:
# - Basic folder structure (db/, srv/, app/)
# - package.json with CAP dependencies
# - TypeScript configuration
# - MTA deployment descriptor
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install additional required packages
npm install --save @sap/cds@^9 @sap/cds-mtxs@^3 @cap-js/hana@^2 @sap/xssec@^4 express@^4

# Install dev dependencies
npm install --save-dev @cap-js/sqlite@^2 @cap-js/cds-types@^0.14.0 @types/node@^22.0.0 tsx@^4 typescript@^5 @cap-js/cds-typer
```

### Step 3: Configure package.json

Update your `package.json` with proper configuration:

```json
{
  "name": "my-cap-project",
  "version": "1.0.0",
  "description": "My CAP Multitenant Application",
  "dependencies": {
    "@sap/cds": "^9",
    "@sap/cds-mtxs": "^3",
    "@sap/xssec": "^4",
    "@cap-js/hana": "^2",
    "express": "^4"
  },
  "devDependencies": {
    "@cap-js/sqlite": "^2",
    "@cap-js/cds-types": "^0.14.0",
    "@types/node": "^22.0.0",
    "tsx": "^4",
    "typescript": "^5",
    "@cap-js/cds-typer": ">=0.1"
  },
  "scripts": {
    "start": "cds-serve",
    "watch:server": "cds watch --profile local-multitenancy",
    "watch:sidecar": "cds watch mtx/sidecar --profile local-multitenancy",
    "start:router": "cds bind --exec -- npm start --prefix router --profile local-multitenancy",
    "sleep:5": "sleep 5",
    "sleep:10": "sleep 10"
  },
  "private": true,
  "imports": {
    "#cds-models/*": "./@cds-models/*/index.js"
  }
}
```

---

## Project Structure

Create the following directory structure:

```
my-cap-project/
├── db/                         # Database layer
│   ├── schema.cds             # Data model definitions
│   └── data/                  # Initial data (CSV/JSON)
│       ├── namespace-Entity1.json
│       └── namespace-Entity2.json
├── srv/                       # Service layer
│   ├── service1.cds           # Service definitions
│   ├── service1.ts            # Service implementation (TypeScript)
│   ├── service2.cds
│   └── service2.ts
├── app/                       # UI applications
│   └── router/                # App Router module
│       ├── package.json
│       ├── xs-app.json
│       └── index.html
├── router/                    # Local router (for development)
│   ├── package.json
│   ├── xs-app.json
│   ├── default-env.json       # Local destinations (gitignored)
│   └── launchpad/
│       └── flp.html           # Local Fiori Launchpad
├── mtx/
│   └── sidecar/               # MTX Sidecar module
│       └── package.json
├── @cds-models/               # Generated TypeScript types
├── package.json               # Root dependencies
├── tsconfig.json              # TypeScript configuration
├── eslint.config.mjs          # ESLint configuration
├── mta.yaml                   # MTA deployment descriptor
├── xs-security.json           # XSUAA security configuration
└── .gitignore
```

---

## Configuration Files

### TypeScript Configuration (`tsconfig.json`)

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "allowJs": true,
    "paths": {
      "#cds-models/*": ["./@cds-models/*"]
    }
  }
}
```

### ESLint Configuration (`eslint.config.mjs`)

```javascript
import cds from '@sap/cds/eslint.config.mjs'
export default [ ...cds.recommended ]
```

### .gitignore

```gitignore
# CAP generated files
gen/
@cds-models/
*.db
*.db-shm
*.db-wal

# Node.js
node_modules/
npm-debug.log
package-lock.json

# TypeScript
*.tsbuildinfo

# Environment files
default-env.json
.env

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Build artifacts
dist/
mta_archives/
.mta/
```

---

## Database Layer

### Step 1: Define Schema (`db/schema.cds`)

```cds
namespace myapp;

using { managed, cuid } from '@sap/cds/common';

/**
 * Main entity with managed fields (createdAt, modifiedAt, etc.)
 */
entity MainEntities : managed, cuid {
  name        : String(100) @mandatory;
  description : String(500);
  status      : String(20) @assert.range enum {
    Draft    = 'DRAFT';
    Active   = 'ACTIVE';
    Archived = 'ARCHIVED';
  } default 'DRAFT';
  
  // Composition: child entities are part of parent lifecycle
  children    : Composition of many ChildEntities on children.parent = $self;
  
  // Virtual calculated field
  virtual calculatedField : Integer;
}

/**
 * Child entity with association back to parent
 */
entity ChildEntities : managed, cuid {
  title       : String(200) @mandatory;
  priority    : String(10) @assert.range enum {
    Low      = 'LOW';
    Medium   = 'MEDIUM';
    High     = 'HIGH';
  } default 'MEDIUM';
  
  // Association to parent
  parent      : Association to MainEntities;
}
```

### Step 2: Add Initial Data (`db/data/`)

Create JSON files for initial data:

**`db/data/myapp-MainEntities.json`**:
```json
[
  {
    "ID": "11111111-1111-1111-1111-111111111111",
    "name": "Example Entity 1",
    "description": "Description for entity 1",
    "status": "ACTIVE"
  },
  {
    "ID": "22222222-2222-2222-2222-222222222222",
    "name": "Example Entity 2",
    "description": "Description for entity 2",
    "status": "DRAFT"
  }
]
```

**`db/data/myapp-ChildEntities.json`**:
```json
[
  {
    "ID": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "title": "Child 1 for Entity 1",
    "priority": "HIGH",
    "parent_ID": "11111111-1111-1111-1111-111111111111"
  }
]
```

---

## Service Layer

### Step 1: Define Services (`srv/admin-service.cds`)

```cds
using { myapp } from '../db/schema';

/**
 * Admin service with full CRUD operations and role-based authorization
 */
@path: '/admin'
service AdminService {
  
  @requires: 'authenticated-user'
  @restrict: [
    { grant: '*', to: 'Admin' },
    { grant: 'READ', to: 'Viewer' }
  ]
  entity MainEntities as projection on myapp.MainEntities {
    *,
    children : redirected to ChildEntities
  };
  
  @requires: 'authenticated-user'
  @restrict: [
    { grant: '*', to: 'Admin' },
    { grant: ['READ', 'UPDATE'], to: 'Editor' }
  ]
  entity ChildEntities as projection on myapp.ChildEntities {
    *,
    parent : redirected to MainEntities
  };
  
  // Custom action
  @requires: 'authenticated-user'
  action performAction(
    entityID: UUID,
    parameter: String
  ) returns {
    success: Boolean;
    message: String;
  };
  
  // Custom function
  @requires: 'authenticated-user'
  function getStats(
    entityID: UUID
  ) returns {
    totalChildren: Integer;
    activeChildren: Integer;
  };
}
```

**Public Service (`srv/public-service.cds`)**:

```cds
using { myapp } from '../db/schema';

/**
 * Public read-only service
 */
@path: '/public'
service PublicService {
  
  @readonly
  entity MainEntities as projection on myapp.MainEntities {
    *,
    children : redirected to ChildEntities
  };
  
  @readonly
  entity ChildEntities as projection on myapp.ChildEntities {
    *,
    parent : redirected to MainEntities
  };
}
```

### Step 2: Implement Service Logic (`srv/admin-service.ts`)

**Following CAP Best Practices**: Service-centric design with event handlers.

```typescript
import cds from '@sap/cds';
import type { Request } from '@sap/cds';

/**
 * AdminService implementation with event handlers
 * Following CAP best practices: service-centric design with before/on/after handlers
 */
export default class AdminService extends cds.ApplicationService {
  
  async init() {
    const { MainEntities, ChildEntities } = this.entities;
    
    // ============================================================
    // BEFORE Handlers - Validation & Preprocessing
    // ============================================================
    
    /**
     * Validate main entity data before creation/update
     */
    this.before(['CREATE', 'UPDATE'], MainEntities, async (req) => {
      const entity = req.data;
      
      // Example validation
      if (entity.name && entity.name.length < 3) {
        req.error(400, 'Name must be at least 3 characters');
      }
    });
    
    /**
     * Validate child entity data before creation/update
     */
    this.before(['CREATE', 'UPDATE'], ChildEntities, async (req) => {
      const child = req.data;
      
      // Validate parent association exists
      if (child.parent_ID) {
        const parent = await SELECT.one.from(MainEntities).where({ ID: child.parent_ID });
        if (!parent) {
          req.error(404, `Parent entity with ID ${child.parent_ID} not found`);
        }
      }
    });
    
    /**
     * Prevent deletion of entities with children
     */
    this.before('DELETE', MainEntities, async (req) => {
      const entityID = req.data.ID;
      
      const children = await SELECT.from(ChildEntities).where({
        parent_ID: entityID
      });
      
      if (children.length > 0) {
        req.error(400, `Cannot delete entity with ${children.length} child(ren).`);
      }
    });
    
    // ============================================================
    // AFTER Handlers - Calculated Fields
    // ============================================================
    
    /**
     * Calculate virtual fields after READ
     */
    this.after('READ', MainEntities, async (entities) => {
      const entityList = Array.isArray(entities) ? entities : [entities];
      
      for (const entity of entityList) {
        if (!entity) continue;
        
        // Calculate field based on children
        const children = await SELECT.from(ChildEntities).where({
          parent_ID: entity.ID
        });
        
        entity.calculatedField = children.length;
      }
    });
    
    // ============================================================
    // ON Handlers - Custom Actions & Functions
    // ============================================================
    
    /**
     * Custom action implementation
     */
    this.on('performAction', async (req: Request) => {
      const { entityID, parameter } = req.data;
      
      // Fetch entity
      const entity = await SELECT.one.from(MainEntities).where({ ID: entityID });
      
      if (!entity) {
        return req.error(404, `Entity with ID ${entityID} not found`);
      }
      
      // Perform business logic
      // Use CQL/CQN for data operations
      await UPDATE(MainEntities).set({ 
        status: 'ACTIVE' 
      }).where({ ID: entityID });
      
      return {
        success: true,
        message: `Action performed successfully on entity: ${entity.name}`
      };
    });
    
    /**
     * Custom function implementation
     */
    this.on('getStats', async (req: Request) => {
      const { entityID } = req.data;
      
      const allChildren = await SELECT.from(ChildEntities).where({
        parent_ID: entityID
      });
      
      const activeChildren = allChildren.filter(c => c.priority === 'HIGH');
      
      return {
        totalChildren: allChildren.length,
        activeChildren: activeChildren.length
      };
    });
    
    return super.init();
  }
}
```

---

## Multitenancy Setup

### Step 1: Create MTX Sidecar Package (`mtx/sidecar/package.json`)

```json
{
  "name": "my-cap-project-mtx",
  "version": "1.0.0",
  "description": "MTX Sidecar for multitenant application",
  "dependencies": {
    "@sap/cds": "^9",
    "@sap/cds-mtxs": "^3",
    "@cap-js/hana": "^2",
    "@sap/xssec": "^4",
    "express": "^4"
  },
  "devDependencies": {
    "@cap-js/sqlite": "^2"
  },
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "start": "cds-serve"
  },
  "cds": {
    "profile": "mtx-sidecar",
    "requires": {
      "html5-repo": true, 
      "destinations": true
    }
  }
}
```

### Step 2: Create App Router Module (`app/router/package.json`)

```json
{
  "name": "my-cap-project-approuter",
  "version": "1.0.0",
  "description": "App Router for multitenant application",
  "dependencies": {
    "@sap/approuter": "^20.0.0",
    "@sap/xssec": "^4"
  },
  "scripts": {
    "start": "node node_modules/@sap/approuter/approuter.js"
  }
}
```

### Step 3: Create Router Configuration (`router/xs-app.json`)

```json
{
  "welcomeFile": "/local/launchpad/flp.html",
  "routes": [
    {
      "source": "^/local/launchpad/(.*)$",
      "target": "$1",
      "localDir": "./launchpad",
      "authenticationType": "none"
    },
    {
      "source": "^/-/cds/.*",
      "destination": "mtx-api",
      "authenticationType": "none"
    },
    {
      "source": "^/(.*)$",
      "target": "$1",
      "destination": "srv-api",
      "authenticationType": "none",
      "csrfProtection": true
    }
  ]
}
```

### Step 4: Local Development Router Config (`router/default-env.json`)

**⚠️ Add to .gitignore - contains local configurations**

```json
{
  "destinations": [
    {
      "name": "srv-api",
      "url": "http://localhost:4004",
      "forwardAuthToken": true
    },
    {
      "name": "mtx-api",
      "url": "http://localhost:4005"
    }
  ]
}
```

### Step 5: Create Launchpad (`router/launchpad/flp.html`)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My CAP Application</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .tile-container {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .tile {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            width: 200px;
            text-decoration: none;
            color: #333;
        }
        .tile:hover {
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        h1 { color: #0070f2; }
        h3 { margin: 0 0 10px 0; }
    </style>
</head>
<body>
    <h1>My CAP Application</h1>
    <div class="tile-container">
        <a href="/admin/" class="tile">
            <h3>Admin Service</h3>
            <p>Full CRUD operations</p>
        </a>
        <a href="/public/" class="tile">
            <h3>Public Service</h3>
            <p>Read-only access</p>
        </a>
    </div>
</body>
</html>
```

---

## Security Configuration

### XSUAA Configuration (`xs-security.json`)

```json
{
  "xsappname": "my-cap-project",
  "tenant-mode": "shared",
  "description": "Security descriptor for my multitenant application",
  "scopes": [
    {
      "name": "$XSAPPNAME.Admin",
      "description": "Administrator with full access"
    },
    {
      "name": "$XSAPPNAME.Viewer",
      "description": "Viewer with read-only access"
    },
    {
      "name": "$XSAPPNAME.Editor",
      "description": "Editor with read and update access"
    },
    {
      "name": "$XSAPPNAME.mtcallback",
      "description": "Multi Tenancy Callback Access",
      "grant-as-authority-to-apps": [
        "$XSAPPNAME(application,sap-provisioning,tenant-onboarding)"
      ]
    },
    {
      "name": "$XSAPPNAME.mtdeployment",
      "description": "Scope to trigger a re-deployment of the database artifacts"
    }
  ],
  "attributes": [],
  "role-templates": [
    {
      "name": "Admin",
      "description": "Administrator Role",
      "scope-references": ["$XSAPPNAME.Admin"],
      "attribute-references": []
    },
    {
      "name": "Viewer",
      "description": "Viewer Role",
      "scope-references": ["$XSAPPNAME.Viewer"],
      "attribute-references": []
    },
    {
      "name": "Editor",
      "description": "Editor Role",
      "scope-references": ["$XSAPPNAME.Editor"],
      "attribute-references": []
    }
  ],
  "role-collections": [
    {
      "name": "MyApp_Admin",
      "description": "Administrator with full access",
      "role-template-references": ["$XSAPPNAME.Admin"]
    },
    {
      "name": "MyApp_Viewer",
      "description": "Viewer with read-only access",
      "role-template-references": ["$XSAPPNAME.Viewer"]
    },
    {
      "name": "MyApp_Editor",
      "description": "Editor with update access",
      "role-template-references": ["$XSAPPNAME.Editor"]
    }
  ],
  "oauth2-configuration": {
    "redirect-uris": [
      "https://*.cfapps.*.hana.ondemand.com/**",
      "https://*.applicationstudio.cloud.sap/**"
    ]
  }
}
```

---

## MTA Deployment Descriptor (`mta.yaml`)

```yaml
_schema-version: '3.1'
ID: my-cap-project
version: 1.0.0
description: My CAP Multitenant Application
parameters:
  enable-parallel-deployments: true
build-parameters:
  before-all:
    - builder: custom
      commands:
        - npm ci
        - npx cds build --production

modules:
  # --------------------- APP ROUTER MODULE ---------------------
  - name: my-cap-project-approuter
    type: approuter.nodejs
    path: app
    parameters:
      keep-existing-routes: true
      disk-quota: 256M
      memory: 256M
    properties:
      TENANT_HOST_PATTERN: '^(.*)-${default-uri}'
    requires:
      - name: my-cap-project-uaa
      - name: my-cap-project-destination
      - name: my-cap-project-registry
      - name: srv-api
        group: destinations
        properties:
          name: srv-api
          url: ~{srv-url}
          forwardAuthToken: true
      - name: mtx-api
        group: destinations
        properties:
          name: mtx-api
          url: ~{mtx-url}
    provides:
      - name: app-api
        properties:
          app-protocol: ${protocol}
          app-uri: ${default-uri}

  # --------------------- SERVER MODULE ---------------------
  - name: my-cap-project-srv
    type: nodejs
    path: gen/srv
    parameters:
      buildpack: nodejs_buildpack
      memory: 512M
      disk-quota: 1024M
    properties:
      EXIT: 1
    requires:
      - name: my-cap-project-uaa
      - name: my-cap-project-registry
      - name: my-cap-project-destination
    provides:
      - name: srv-api
        properties:
          srv-url: ${default-url}

  # --------------------- MTX SIDECAR MODULE ---------------------
  - name: my-cap-project-mtx
    type: nodejs
    path: gen/mtx/sidecar
    parameters:
      buildpack: nodejs_buildpack
      memory: 512M
      disk-quota: 1024M
    properties:
      CDS_MULTITENANCY_SIDECAR_URL: ~{mtx-api/mtx-url}
    requires:
      - name: my-cap-project-uaa
      - name: my-cap-project-registry
      - name: my-cap-project-destination
    provides:
      - name: mtx-api
        properties:
          mtx-url: ${default-url}

  # --------------------- DB DEPLOYER MODULE ---------------------
  - name: my-cap-project-db-deployer
    type: hdb
    path: gen/db
    parameters:
      buildpack: nodejs_buildpack
      memory: 256M
      disk-quota: 512M
    requires:
      - name: my-cap-project-uaa

resources:
  # --------------------- UAA SERVICE ---------------------
  - name: my-cap-project-uaa
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
      path: ./xs-security.json
      config:
        tenant-mode: shared
        xsappname: my-cap-project-${org}-${space}

  # --------------------- SAAS REGISTRY SERVICE ---------------------
  - name: my-cap-project-registry
    type: org.cloudfoundry.managed-service
    requires:
      - name: mtx-api
      - name: app-api
    parameters:
      service: saas-registry
      service-plan: application
      config:
        appName: my-cap-project-${org}-${space}
        xsappname: my-cap-project-${org}-${space}
        displayName: 'My CAP Application'
        description: 'My CAP Multitenant Application'
        category: 'Custom Applications'
        appUrls:
          getDependencies: ~{mtx-api/mtx-url}/-/cds/saas-provisioning/dependencies
          onSubscription: ~{mtx-api/mtx-url}/-/cds/saas-provisioning/tenant/{tenantId}
          onSubscriptionAsync: false
          onUnSubscriptionAsync: false
          callbackTimeoutMillis: 300000

  # --------------------- DESTINATION SERVICE ---------------------
  - name: my-cap-project-destination
    type: org.cloudfoundry.managed-service
    parameters:
      service: destination
      service-plan: lite
```

---

## Development Workflow

### Single Tenant Mode (Quick Development)

```bash
# Start with hot-reload
cds watch

# Or production mode
npm start

# Access at http://localhost:4004
```

### Multitenant Mode (Local Testing)

**Terminal 1 - Start MTX Sidecar:**
```bash
npm run watch:sidecar
# Runs on port 4005
```

**Terminal 2 - Start Application Server:**
```bash
npm run watch:server
# Runs on port 4004
```

**Terminal 3 - Start App Router:**
```bash
# First, ensure router/default-env.json is configured
npm run start:router
# Runs on port 5000
```

**Subscribe a tenant:**
```bash
curl -X PUT http://localhost:4005/-/cds/saas-provisioning/tenant/t1 \
  -H "Content-Type: application/json" \
  -d '{"subscribedSubdomain":"t1-localhost"}'
```

**Access URLs:**
- App Router: `http://localhost:5000`
- Server Direct: `http://localhost:4004`
- MTX Sidecar: `http://localhost:4005`

---

## Deployment

### Step 1: Build MTA Archive

```bash
# Build for production
mbt build

# Output: mta_archives/my-cap-project_1.0.0.mtar
```

### Step 2: Deploy to Cloud Foundry

```bash
# Login to CF
cf login -a <api-endpoint>

# Deploy
cf deploy mta_archives/my-cap-project_1.0.0.mtar

# Monitor deployment
cf apps
cf services
```

### Step 3: Subscribe Tenants (Production)

Use SAP BTP Cockpit:
1. Navigate to **Subscriptions**
2. Find your application
3. Click **Subscribe**
4. Assign users to role collections

---

## Testing

### Unit Testing Services

Create `test/admin-service.test.ts`:

```typescript
import cds from '@sap/cds';

describe('AdminService', () => {
  let adminService: any;
  
  beforeAll(async () => {
    adminService = await cds.connect.to('AdminService');
  });
  
  it('should create a new main entity', async () => {
    const result = await adminService.create('MainEntities', {
      name: 'Test Entity',
      description: 'Test Description',
      status: 'ACTIVE'
    });
    
    expect(result).toHaveProperty('ID');
    expect(result.name).toBe('Test Entity');
  });
  
  it('should read entities', async () => {
    const entities = await adminService.read('MainEntities');
    expect(Array.isArray(entities)).toBe(true);
  });
});
```

### Testing with REST Client

Create `test/requests.http`:

```http
### Get all entities
GET http://localhost:4004/admin/MainEntities
Content-Type: application/json

### Create new entity
POST http://localhost:4004/admin/MainEntities
Content-Type: application/json

{
  "name": "Test Entity",
  "description": "Created via REST",
  "status": "ACTIVE"
}

### Call custom action
POST http://localhost:4004/admin/performAction
Content-Type: application/json

{
  "entityID": "11111111-1111-1111-1111-111111111111",
  "parameter": "test"
}

### Call custom function
GET http://localhost:4004/admin/getStats(entityID='11111111-1111-1111-1111-111111111111')
```

---

## Best Practices Checklist

### ✅ CAP Best Practices

- [ ] **Service-Centric Design**: All logic in services, not in entities
- [ ] **Event Handlers**: Use `before/on/after` handlers for business logic
- [ ] **Passive Data**: Plain objects only, no DAOs, DTOs, or Active Record
- [ ] **CQL/CQN**: Use CAP's query language, not ORM frameworks
- [ ] **Agnostic Design**: Stay protocol, DB, and platform-agnostic

### ✅ TypeScript Configuration

- [ ] **Strict Mode**: Enable `strict: true` in tsconfig.json
- [ ] **Type Safety**: Use generated `@cds-models` types
- [ ] **Path Mapping**: Configure `#cds-models/*` imports

### ✅ Security

- [ ] **Authentication**: Use `@requires: 'authenticated-user'`
- [ ] **Authorization**: Define roles with `@restrict` annotations
- [ ] **CSRF Protection**: Enable in router (`csrfProtection: true`)
- [ ] **XSUAA**: Configure proper scopes and role templates

### ✅ Dependency Management

- [ ] **Caret Versions**: Use `^` for all dependencies
- [ ] **Regular Updates**: Keep dependencies up to date
- [ ] **Security Audits**: Run `npm audit` regularly

### ✅ Error Handling

- [ ] **Validation**: Use `before` handlers for input validation
- [ ] **Error Messages**: Provide clear, actionable error messages
- [ ] **Let it Crash**: Don't catch unexpected errors

### ✅ Multitenancy

- [ ] **Tenant Isolation**: Use MTX sidecar for tenant management
- [ ] **HANA Cloud**: Configure for production deployment
- [ ] **SaaS Registry**: Proper subscription lifecycle hooks

### ✅ Code Quality

- [ ] **ESLint**: Use CAP's recommended ESLint config
- [ ] **Code Comments**: Document complex business logic
- [ ] **Version Control**: Use Git with meaningful commit messages

---

## Common Commands Reference

```bash
# Development
cds watch                          # Start with hot-reload
cds watch --profile production     # Test production profile

# Database
cds deploy --to sqlite             # Deploy to SQLite (local)
cds deploy --to hana               # Deploy to HANA

# Code Generation
cds build                          # Build for production
npx @cap-js/cds-typer              # Generate TypeScript types

# Testing
npm test                           # Run tests
cds serve --in-memory              # Test with in-memory DB

# Deployment
mbt build                          # Build MTA archive
cf deploy mta_archives/*.mtar      # Deploy to Cloud Foundry

# Multitenancy
cds bind --exec npm start          # Bind to local services
curl -X PUT http://localhost:4005/-/cds/saas-provisioning/tenant/<id>  # Subscribe tenant
```

---

## Additional Resources

- **CAP Documentation**: https://cap.cloud.sap/docs/
- **CAP Best Practices**: https://cap.cloud.sap/docs/about/best-practices
- **CAP Node.js**: https://cap.cloud.sap/docs/node.js/
- **CAP Multitenancy**: https://cap.cloud.sap/docs/guides/multitenancy/
- **TypeScript in CAP**: https://cap.cloud.sap/docs/node.js/typescript
- **MTA**: https://help.sap.com/docs/BTP/65de2977205c403bbc107264b8eccf4b/

---

## Troubleshooting

### Issue: "Cannot find module '@cds-models'"

**Solution**: Run `npx @cap-js/cds-typer` to generate TypeScript types.

### Issue: Router can't connect to services

**Solution**: Check `router/default-env.json` has correct ports (4004 for srv, 4005 for mtx).

### Issue: Tenant subscription fails

**Solution**: 
- Ensure MTX sidecar is running
- Check XSUAA configuration
- Verify SaaS Registry callback URLs

### Issue: Build fails with TypeScript errors

**Solution**:
- Run `npm install` in all subdirectories
- Regenerate types with `npx @cap-js/cds-typer`
- Check `tsconfig.json` path mappings

---

## Conclusion

This setup provides a production-ready, multitenant SAP CAP application with:

- ✅ TypeScript for type safety
- ✅ Multitenancy with MTX sidecar
- ✅ Role-based authorization
- ✅ CAP best practices (service-centric, event handlers, CQL/CQN)
- ✅ Proper security configuration
- ✅ Local development workflow
- ✅ Cloud Foundry deployment ready

Use this as a template for future CAP projects. Customize the data model, services, and business logic while maintaining the architectural patterns and best practices documented here.
