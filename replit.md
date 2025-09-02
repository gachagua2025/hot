# MikroTik Hotspot Management System

## Overview

This is a full-stack web application for managing MikroTik router hotspots with integrated M-Pesa payment processing. The system provides a captive portal for WiFi users to purchase internet access plans and an admin dashboard for managing subscriptions, routers, and payments. The application handles the complete flow from user authentication through MikroTik routers to payment processing via M-Pesa STK Push.

## User Preferences

Preferred communication style: Simple, everyday language.

## Current Setup (August 2025)

### Database Configuration
- **PostgreSQL**: Provisioned via Replit PostgreSQL service
- **Connection**: DATABASE_URL automatically provided by Replit
- **Schema**: Fully migrated with all required tables
- **Database Name**: neondb
- **Host**: ep-calm-sea-afulrfis.c-2.us-west-2.aws.neon.tech
- **Status**: Production-ready with all tables created and seeded

### Admin Access
- **URL**: http://localhost:5000/admin (or current Replit preview URL + /admin)
- **Username**: admin
- **Password**: admin123
- **Email**: admin@hotspot.com
- **Role**: admin
- **Access**: Full system administration and management
- **Status**: Successfully created and verified

### Super Admin Access
- **URL**: http://localhost:5000/superadmin (or current Replit preview URL + /superadmin)
- **Features**: Multi-tenant provider management, router assignment, revenue analytics
- **Note**: Super admin credentials need to be manually created via database interface or direct SQL insert
- **Required Tables**: super_admins, providers, payment_gateways, provider_payment_gateways
- **Status**: Full system implemented and functional

### Subscription Plans
- **Basic Plan**: KSh 10.00 (1 hour, 5 Mbps, 1GB data limit)
- **Standard Plan**: KSh 25.00 (3 hours, 10 Mbps, 3GB data limit)
- **Premium Plan**: KSh 45.00 (6 hours, 20 Mbps, 6GB data limit)

### M-Pesa Integration (Production)
- **Environment**: Production
- **Business Short Code**: 4168257
- **Callback URL**: https://609dcc95725c.ngrok-free.app/api/payment/callback
- **Status**: Fully functional with STK Push integration
- **Security**: All credentials stored as Replit environment secrets

### ngrok Configuration
- **Auth Token**: Configured for real-time payment callbacks
- **Purpose**: Enables instant M-Pesa callback processing
- **Status**: Ready for production use

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Routing**: Wouter for client-side routing with three main routes: captive portal (`/`), admin login (`/admin`), and admin dashboard (`/admin/dashboard`)
- **UI Components**: Radix UI primitives with shadcn/ui design system and Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and caching with improved polling controls
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Recent Improvements (August 2025)
- **Database Migration Complete**: Successfully migrated from in-memory storage to PostgreSQL with Neon serverless hosting
- **Database Schema Deployed**: All tables created and verified (admins, subscription_plans, mikrotik_routers, hotspot_users, mpesa_transactions, user_sessions)
- **Admin System Configured**: Created admin user (username: admin, password: admin123) with full system access
- **Database Connection Fixed**: Updated Neon serverless configuration with proper WebSocket support and connection pooling
- **Application Database-Ready**: Server running successfully on port 5000 with full database connectivity
- **OpenVPN Client Integration**: Added OpenVPN client support for secure remote MikroTik router connections
- **Enhanced Router Management**: Updated router dialog with tabbed interface supporting both direct and VPN connections
- **Automatic Configuration Generation**: System generates MikroTik RouterOS scripts and setup guides for OpenVPN clients
- **Secure Certificate Management**: Implemented certificate generation and management for VPN connections
- **Payment Callback Issue Fixed**: Payment status polling now stops correctly when transactions complete, eliminating infinite polling
- **MikroTik Integration Ready**: Router management endpoints active with auto-discovery system configured for network scanning
- **Real-time Payment Processing**: M-Pesa payments processing successfully with instant callbacks via ngrok
- **End-to-End Testing**: Complete payment flow tested and validated with both success and failure scenarios
- **Router Connection Troubleshooting**: Identified connection timeout issues (errno -110) with existing router configurations - network isolation between Replit environment and user's MikroTik router at 102.210.56.210
- **Comprehensive Documentation**: Created step-by-step guides for router setup and payment testing
- **Production Activity**: System actively processing real customer payments and transactions with confirmed revenue generation

### Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API with routes for authentication, payment processing, and CRUD operations
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based authentication stored in sessionStorage (development setup)
- **Error Handling**: Centralized error handling middleware with structured error responses

### Database Design
- **Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Tables**: 
  - `super_admins` - System-level administrators with oversight privileges
  - `providers` - Service providers who manage their own router networks
  - `provider_payment_gateways` - Links providers to their payment gateway configurations
  - `payment_gateways` - Available payment methods (M-Pesa, Airtel Money, banks)
  - `admins` - Provider-specific admin user accounts
  - `subscription_plans` - Internet access plans with pricing and duration
  - `mikrotik_routers` - Router configuration and provider assignment details
  - `hotspot_users` - WiFi users and their subscription status
  - `mpesa_transactions` - Payment transaction records
  - `user_sessions` - Active user session tracking
  - `vouchers` - Pre-paid access vouchers with redemption tracking

### Multi-Tenant Architecture
- **Super Admin Level**: System oversight, provider management, router assignment, revenue analytics
- **Provider Level**: Router management, captive portal customization, payment gateway configuration
- **User Level**: WiFi access, subscription management, payment processing

### Integration Services

#### MikroTik Router Integration
- **Protocol**: RouterOS API for remote router management
- **Functionality**: User creation, session management, and bandwidth control
- **Connection**: Direct API calls to configured MikroTik routers with credential management
- **User Management**: Automatic hotspot user provisioning based on subscription plans

#### M-Pesa Payment Integration
- **API**: Safaricom M-Pesa STK Push for mobile money payments
- **Flow**: Payment initiation → STK Push → callback processing → user activation
- **Security**: OAuth token management and callback URL verification
- **Transaction Tracking**: Complete audit trail of payment attempts and completions

### Security Considerations
- **Password Hashing**: bcryptjs for admin password security
- **Input Validation**: Zod schemas for runtime type checking and validation
- **Database Security**: Parameterized queries through Drizzle ORM
- **Environment Variables**: Sensitive configuration stored in environment variables

### Development Tools
- **Build System**: Vite with hot module replacement for fast development
- **Type Safety**: Full TypeScript coverage across frontend, backend, and shared schemas
- **Code Quality**: ESLint and Prettier for consistent code formatting
- **Database Tools**: Drizzle Studio for database management and debugging

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Payment Gateway**: Safaricom M-Pesa Daraja API for mobile payments
- **Network Equipment**: MikroTik RouterOS devices for WiFi hotspot management

### Third-Party Services
- **Authentication**: Custom session-based authentication (can be upgraded to OAuth providers)
- **UI Components**: Radix UI for accessible component primitives
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Google Fonts integration for typography

### Development Dependencies
- **Runtime**: Node.js with ES modules
- **Package Manager**: npm for dependency management
- **Development Server**: Vite dev server with proxy configuration for API calls
- **Database Migration**: Drizzle Kit for schema versioning and deployment

## Deployment

### VPS Deployment
The system includes comprehensive deployment scripts and configuration for production VPS deployment:

- **Automated Deployment**: `deploy.sh` script handles complete server setup
- **Process Management**: PM2 ecosystem configuration for production scaling
- **Web Server**: Nginx configuration with SSL, security headers, and rate limiting
- **Database**: PostgreSQL with automated backup scripts
- **Environment**: Production environment configuration template
- **Security**: Firewall configuration, SSL certificates, and secure headers

### Deployment Files
- `DEPLOYMENT.md` - Complete step-by-step deployment guide
- `deploy.sh` - Automated deployment script for Ubuntu/Debian VPS
- `ecosystem.config.js` - PM2 process management configuration
- `nginx.conf` - Production-ready Nginx configuration
- `.env.example` - Environment variables template
- `package-scripts/production-setup.js` - Database and admin user setup script

### Production Requirements
- Ubuntu 20.04+ VPS server
- Domain name with DNS configuration
- PostgreSQL database (local or cloud)
- SSL certificate (Let's Encrypt recommended)
- M-Pesa production API credentials