# TaskMaster - Multitenant CAP Project Management Application

A comprehensive **multitenant** SAP CAP application demonstrating project management with two distinct services: **PublicService** (read-only) and **AdminService** (full CRUD with role-based authorization).

## 🏗️ Architecture

This is a **multitenant SaaS application** with:
- **App Router**: Authentication & routing gateway
- **Application Server**: Business logic (Node.js/TypeScript)
- **MTX Sidecar**: Tenant provisioning & lifecycle management
- **SAP HANA Cloud**: Multitenant database with isolated schemas
- **XSUAA**: Authentication & authorization service
- **SaaS Registry**: Subscription management

## Features

### Data Model
- **Projects**: Manage work initiatives with budget tracking, status management, and date ranges
- **Tasks**: Individual work items with priority levels, effort tracking, and assignments
- **Relationships**: Composition (Projects → Tasks) and Associations
- **Calculated Fields**: Completion rates, remaining budget, overdue status

### Services

#### PublicService (`/public`)
- **Read-only access** to projects and tasks
- No authentication required
- Hides sensitive financial data (actualCost)

#### AdminService (`/admin`)
- **Full CRUD operations** with role-based authorization
- **Roles**:
  - `ProjectManager`: Full access to all operations
  - `ProjectViewer`: Read-only access
  - `TaskAssignee`: Read and update tasks

### Custom Actions & Functions

1. **completeTask**: Mark a task as completed with timestamp
2. **assignTask**: Assign tasks to users (auto-updates status)
3. **updateProjectBudget**: Update budget and track costs
4. **getProjectStats**: Get project statistics (completion rate, overdue tasks)

## Quick Start

### Prerequisites

```bash
# Install all dependencies
npm install
cd router && npm install && cd ..
cd mtx/sidecar && npm install && cd ../..
```

### Option 1: Single Tenant Mode (Development)

```bash
# Start with hot-reload
cds watch

# Or production mode
npm start
```

Access at `http://localhost:4004`

### Option 2: Multitenant Mode (Local Testing)

> **Note**: Ensure you have created `router/default-env.json` with destination configurations for `srv-api` (port 4004) and `mtx-api` (port 4005).

```bash
# Terminal 1 - Start MTX Sidecar (port 4005)
npm run watch:sidecar

# Terminal 2 - Start Application Server (port 4004)
npm run watch:server

# Terminal 3 - Start App Router (port 5000)
npm run start:router
```

**Subscribe a tenant:**
```bash
curl -X PUT http://localhost:4005/-/cds/saas-provisioning/tenant/t1 \
  -H "Content-Type: application/json" \
  -d '{"subscribedSubdomain":"t1-localhost"}'
```

Access at:
- **App Router**: `http://localhost:5000` (production-like with routing)
- **Server Direct**: `http://localhost:4004` (for testing)
- **MTX Sidecar**: `http://localhost:4005` (tenant management)

### Router Configuration

The App Router requires `router/default-env.json` with destination configurations:

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
      "url": "http://localhost:4005",
      "forwardAuthToken": true
    }
  ]
}
```

### Cloud Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

## Access the Application

### Public Service (No Auth)
```
http://localhost:4004/public/Projects
http://localhost:4004/public/Tasks
```

### Admin Service (Requires Auth)

Test users:
- **admin/admin** - ProjectManager role (full access)
- **viewer/viewer** - ProjectViewer role (read-only)
- **assignee/assignee** - TaskAssignee role (read + update tasks)

```
http://localhost:4004/admin/Projects
http://localhost:4004/admin/Tasks
```

## Example API Calls

### Get Project with Statistics
```http
GET http://localhost:4004/admin/Projects?$expand=tasks
Authorization: Basic admin:admin
```

### Complete a Task
```http
POST http://localhost:4004/admin/completeTask
Authorization: Basic admin:admin
Content-Type: application/json

{
  "taskID": "t2222222-2222-2222-2222-222222222222"
}
```

### Assign a Task
```http
POST http://localhost:4004/admin/assignTask
Authorization: Basic admin:admin
Content-Type: application/json

{
  "taskID": "t3333333-3333-3333-3333-333333333333",
  "assignedTo": "John Developer"
}
```

### Update Project Budget
```http
POSTapp/                         # App Router module
│   ├── package.json
│   └── xs-app.json             # Routing configuration
├── db/
│   ├── schema.cds              # Data model definitions
│   └── data/                   # Initial data
├── srv/
│   ├── public-service.cds      # Public read-only service
│   ├── admin-service.cds       # Admin service with auth
│   └── admin-service.ts        # Event handlers implementation
├── mtx/
│   └── sidecar/                # MTX Sidecar module
│       └── package.json        # MTX configuration
├── mta.yaml                     # MTA deployment descriptor
├── xs-security.json            # XSUAA security configuration
├── .cdsrc.json                 # CDS build configuration
├── package.json                # Main app configuration
├── DEPLOYMENT.md               # Deployment guide
└── MULTITENANCY.md             # Multitenancy documentation
### Get Project Statistics
```http
POST http://localhost:4004/admin/getProjectStats
Authorization: Basic admin:admin
Content-Type: application/json

{
  "projectID": "11111111-1111-1111-1111-111111111111"
}
```

## Project Structure

```
taskly-poc/
├── router/                     # App Router (port 5000)
│   ├── package.json
│   ├── xs-app.json             # Routing configuration
│   ├── default-env.json        # Local destination config
│   └── launchpad/
│       └── flp.html            # Fiori Launchpad
├── db/
│   ├── schema.cds              # Data model definitions
│   └── data/
│       ├── taskly-Projects.json
│       └── taskly-Tasks.json
├── srv/
│   ├── public-service.cds      # Public read-only service
│   ├── admin-service.cds       # Admin service with auth
│   └── admin-service.ts        # Event handlers implementation
├── mtx/
│   └── sidecar/                # MTX Sidecar (port 4005)
│       └── package.json        # MTX configuration
├── @cds-models/                # Generated TypeScript types
├── mta.yaml                    # MTA deployment descriptor
├── xs-security.json            # XSUAA security configuration
├── package.json                # Main app configuration
└── README.md
```

## Technology Stack

- **SAP CAP** (Cloud Application Programming Model) v9
- **@sap/cds-mtxs** for multitenancy and extensibility
- **App Router** (@sap/approuter) for authentication and routing
- **XSUAA** (@sap/xssec) for OAuth2/JWT authentication
- **TypeScript** for type-safe service implementations
- **SQLite** (@cap-js/sqlite) for local development
- **SAP HANA Cloud** (@cap-js/hana) for production (tenant-isolated schemas)
- **OData V4** protocol support

## Multitenancy Features

✅ **Tenant Isolation**: Each tenant gets isolated database schema  
✅ **Subscription Management**: Automated provisioning/deprovisioning  
✅ **Upgrade Support**: Zero-downtime tenant upgrades  
✅ **Extensibility Ready**: Support for tenant-specific extensions  
✅ **SaaS Registry**: Integrated with BTP SaaS provisioning  
✅ **App Router**: Tenant-aware routing with subdomain support

## CAP Best Practices Implemented

✅ **Service-Centric Design**: Logic in services, not entities  
✅ **Event Handlers**: before/on/after for validation and business logic  
✅ **Passive Data**: Plain objects, no DAOs/DTOs  
✅ **CQL/CQN**: Native CAP querying  
✅ **Managed Aspects**: Using `managed` and `cuid` from @sap/cds/common  
✅ **Authorization**: Role-based access with @requires and @restrict  
✅ **Associations & Compositions**: Proper relationship modeling  
✅ **Calculated Fields**: Virtual fields computed at runtime  

## Key Implementation Highlights

### Validation in BEFORE Handlers
- Date validation (start < end)
- Budget validation (non-negative, warnings for overruns)
- Task hours validation
- Project deletion protection

### Calculated Fields in AFTER Handlers
- Project completion rate based on task status
- Remaining budget calculation
- Task overdue status

### Custom Actions
- Business logic encapsulated in service actions
- Proper error handling and validation
- Transaction safety

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start server in production mode |
| `cds watch` | Start with hot-reload (development) |
| `npm run watch:server` | Start server with local-multitenancy profile |
| `npm run watch:sidecar` | Start MTX sidecar with local-multitenancy profile |
| `npm run start:router` | Start App Router with CDS bindings |

## Troubleshooting

### Router won't start - "unknown destination"
Ensure `router/default-env.json` exists with the correct destination configurations (see Router Configuration section above).

### Port conflicts
Default ports:
- **4004**: Application server
- **4005**: MTX sidecar
- **5000**: App Router

Check if ports are in use: `netstat -ano | findstr "4004"`

### Tenant subscription fails
Ensure the MTX sidecar is running on port 4005 before subscribing tenants.

## Learn More

- [SAP CAP Documentation](https://cap.cloud.sap/docs/)
- [CAP Best Practices](https://cap.cloud.sap/docs/about/best-practices)
- [Multitenancy Guide](https://cap.cloud.sap/docs/guides/multitenancy/)
- [TypeScript in CAP](https://cap.cloud.sap/docs/node.js/typescript)

## License

This is a proof-of-concept project for demonstration purposes.


- **SAP CAP** (Cloud Application Programming Model)
- **TypeScript** for type-safe service implementations
- **SQLite** for local development database
- **OData V4** protocol support

## License

This is a proof-of-concept project for demonstration purposes.

`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start adding content, for example, a [db/schema.cds](db/schema.cds).


## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.
