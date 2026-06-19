import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Common Auth Service API",
            version: "2.0.0",
            description:
                "Central, multi-tenant authentication microservice. Every client project " +
                "gets its own dedicated database, selected via the X-Tenant-Id header.",
        },
        servers: [
            {
                url: "http://localhost:4000/api",
                description: "Development Server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
                tenantId: {
                    type: "apiKey",
                    in: "header",
                    name: "X-Tenant-Id",
                    description: "Identifies which client project's database to use.",
                },
                adminKey: {
                    type: "apiKey",
                    in: "header",
                    name: "X-Admin-Key",
                    description: "Required for the tenant-management (admin) endpoints.",
                },
            },
        },
    },
    apis: ["./src/routes/*.ts"],
});
