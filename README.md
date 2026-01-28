# 🚜 Daltex Maintenance Management System

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=flat&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## 📋 Overview

**Daltex Maintenance Management** is a comprehensive, enterprise-grade solution designed to streamline maintenance operations, asset tracking, and inventory management for agricultural and industrial sectors.

This application provides a centralized platform for managing machines, tracking breakdowns, scheduling maintenance, forecasting material needs, and handling complex asset transfers with warranty tracking.

---

## ✨ Key Features

### 🛠️ Maintenance & Operations
-   **Dashboard Analytics**: Real-time overview of system status, tasks, and alerts.
-   **Issue Tracking**: Streamlined reporting and management of maintenance issues.
-   **Breakdown Management**: Detailed logging of machine breakdowns with root cause analysis.
-   **Maintenance Planning**: Schedule preventive maintenance tasks and manage work orders.

### 🚜 Asset & Inventory Management
-   **Asset Lifecycle**: Full lifecycle tracking from acquisition to transfer or disposal.
-   **Master Data Management**: Centralized control for Items, Machines, Locations, Sectors, and Plans.
-   **Stock Control**: Inventory management with approval workflows and stock level monitoring.
-   **BOM (Bill of Materials)**: Associate spare parts with specific machine models.
-   **Warranty Management**: Track machine warranties and supplier details.

### 🌾 Specialized Agri-Modules
-   **Agri Work Orders**: Manage tractor and pivot operations, tracking hours and outputs.
-   **Irrigation Logs**: Track generator and engine usage for irrigation systems.
-   **Material Forecast**: Predict spare part requirements based on maintenance schedules and historical data.

---

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites
-   **Node.js**: v16.0.0 or higher
-   **npm** or **yarn**
-   **Supabase Account**: For the backend database

### 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-org/daltex-maintenance.git
    cd daltex-maintenance
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory based on `.env.example`:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Database Setup**
    -   Log in to your Supabase dashboard.
    -   Go to the **SQL Editor**.
    -   Copy the contents of `supabase_setup.sql` from this project.
    -   Run the script to create the necessary tables, views, and initial data (including the admin user).

### 🏃‍♂️ Running the Application

**Development Server**
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

**Build for Production**
```bash
npm run build
```

**Preview Production Build**
```bash
npm run preview
```

---

## 🔐 Default Access

The system comes pre-configured with a default administrator account:
-   **Username**: `admin`
-   **Password**: `admin`

> ⚠️ **Security Note**: Change this password immediately after the first login via the Settings module.

---

## 🏗️ Tech Stack

-   **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Backend / DB**: [Supabase](https://supabase.com/) (PostgreSQL)
-   **Charts**: [Recharts](https://recharts.org/)
-   **Utilities**: `xlsx` (Excel export), `lucide-react` (Icons)

---

## 📂 Project Structure

```bash
datlex-main/
├── src/
│   ├── components/       # Reusable UI components & Feature views
│   ├── services/         # API and Service layers (Supabase, Storage)
│   ├── constants.ts      # Static data and configuration
│   ├── types.ts          # TypeScript interfaces and types
│   ├── App.tsx           # Main application router and state manager
│   └── main.tsx          # Entry point
├── supabase_setup.sql    # Database schema initialization script
└── package.json          # Dependencies and scripts
```
