# REE Balance Monitor

A fullstack system for monitoring Spain's electrical balance data in real-time using REE's public API.

## 🚀 Features

- Real-time data fetching from REE's API
- MongoDB storage for historical data
- GraphQL API for data access
- React frontend with interactive visualizations
- Docker containerization
- Comprehensive testing suite

## 🏗️ Architecture

### Data Pipeline

1. Backend service periodically fetches data from REE API
2. Data is processed and stored in MongoDB
3. GraphQL API exposes the data
4. React frontend consumes the API and displays visualizations

### Tech Stack

- Backend: Node.js, Express, GraphQL, MongoDB
- Frontend: React, Apollo Client, Recharts
- Infrastructure: Docker, Docker Compose
- Testing: Jest, React Testing Library

## 🛠️ Setup & Installation

### Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development)
- npm or yarn

### Running with Docker

1. Clone the repository:

```bash
git clone [repository-url]
cd ree-balance-monitor
```

2. Start all services:

```bash
docker-compose up
```

The services will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- GraphQL Playground: http://localhost:4000/graphql

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Start backend:

```bash
cd api
npm install
npm run dev
```

3. Start frontend:

```bash
cd web
npm install
npm start
```

## 📊 GraphQL API

### Example Queries

```graphql
# Get electrical balance data for a date range
query GetBalanceData($startDate: String!, $endDate: String!) {
  electricalBalance(startDate: $startDate, endDate: $endDate) {
    timestamp
    generation
    demand
    imports
    exports
  }
}
```

## 🧪 Testing

Run tests for all services:

```bash
npm test
```

Run backend tests:

```bash
cd api
npm test
```

Run frontend tests:

```bash
cd web
npm test
```

## 📝 Documentation

- [API Documentation](./api/README.md)
- [Frontend Documentation](./web/README.md)
- [Testing Documentation](./docs/testing.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License.
