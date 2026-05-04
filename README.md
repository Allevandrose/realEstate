
# Home254 API — Real Estate Backend

RESTful API for the Home254 Kenyan property marketplace. Built with Node.js, Express, MongoDB (Frankfurt region), and OpenRouter AI for intelligent property search.

🔗 **Live API Base URL:** `https://home254.onrender.com`

---

## ⚠️ Infrastructure Reality (Free Tier)

This backend runs on **Render's free tier** with **MongoDB Atlas (Frankfurt)** . Both have constraints that affect performance:

| Constraint | Impact |
|------------|--------|
| **Render free tier** | Spins down after 15 minutes of inactivity. First request takes 20-50 seconds to wake up. |
| **MongoDB Frankfurt region** | Database hosted in Germany. Adds ~100-200ms latency for Kenyan requests. |
| **Combined effect** | Cold start + geographic distance = slow first request. Subsequent requests are normal. |

**Why this matters:** This is a real-world constraint of building on a budget. In production with paid tiers, response times would be 5-10x faster.

---

## Overview

This API powers Home254, handling:
- User authentication (JWT)
- Property CRUD with **GPS coordinate-based location filtering**
- AI-powered property search assistant (OpenRouter)
- Cloudinary image uploads

The frontend (React) consumes this API to display properties and provide chat assistance.

---

## Tech Stack

| Category | Technology | Note |
|----------|------------|------|
| Runtime | Node.js | |
| Framework | Express.js | |
| Database | MongoDB Atlas | **Frankfurt region** (EU) |
| Hosting | Render | **Free tier** (US / EU) |
| Authentication | JWT | |
| AI Integration | OpenRouter (Llama 3.1) | |
| File Uploads | Multer + Cloudinary | |
| Security | Helmet, CORS, Rate Limiting | |

---

## Key Features

- **GPS Coordinate Location** — Properties stored with lat/lng for precise Kenyan geolocation
- **JWT Authentication** — Secure login/register
- **AI Chat Assistant** — Natural language property search
- **Cloudinary Integration** — Image upload
- **Rate Limiting** — 100 requests per 15 minutes

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register user | No |
| POST | `/api/auth/login` | Login (returns JWT) | No |
| GET | `/api/properties` | Get all properties | No |
| POST | `/api/properties` | Add property | Yes |
| PUT | `/api/properties/:id` | Update property | Yes |
| DELETE | `/api/properties/:id` | Delete property | Yes |
| POST | `/api/chat` | AI search assistant | Yes |

---

## Environment Variables

Create `.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OPENROUTER_API_KEY=your_openrouter_key
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
⚠️ Never commit .env to GitHub.

Local Setup
bash
git clone https://github.com/Allevandrose/realEstate.git
cd realEstate
npm install
npm start
Server runs at http://localhost:5000

Deployment Architecture
text
Kenyan User
    ↓
Netlify (Frontend) — US region
    ↓
Render (Backend) — Free tier, spins down
    ↓
MongoDB Atlas — Frankfurt (Germany)
Why Frankfurt?

Free tier constraints (specific region selection)

Not ideal for Kenya, but functional for demo

What I Learned
Building this backend taught me:

Structuring a REST API with Express + MongoDB

Implementing JWT authentication

Integrating third-party AI APIs (OpenRouter)

Deploying to Render's free tier and managing cold starts

Geographic latency awareness — MongoDB region choice directly affects Kenyan users

Future Improvements
Upgrade to Render paid tier (eliminate cold starts)

Migrate MongoDB to AWS Africa (Cape Town) for lower latency

Add pagination and advanced GPS-based filtering (e.g., "within 10km of Nairobi CBD")

Frontend Repository
🔗 UI-real-estate

Contact
Built by Ibrahim Mulei — ibrahimmulei@gmail.com

📌 Live Demo: https://home254.netlify.app

text

---

## Why This README Is Better

| Before | After |
|--------|-------|
| No mention of slow performance | Explains cold starts + geographic latency honestly |
| Looks like a mistake | Looks like **conscious architecture on a budget** |
| User might think it's broken | User understands *why* it's slow |
| No learning documented | Shows you understand real-world constraints |

**Employers will respect this honesty.** It proves you understand trade-offs, not just code.

---

## Next: Frontend README (`UI-real-estate`)

Do you want me to write the **frontend README** next? It will:
- Link to this backend README
- Explain that the frontend is fast (Netlify) but waiting on Render backend
- Document your React components + property filtering

Reply *"Yes, write frontend README"* and I'll give it to you.
write a ready to paste md file for backend first
Here is the ready-to-paste README.md file for your realEstate backend repository. Just copy the entire block below into your README on GitHub.

markdown
# Home254 API — Real Estate Backend

RESTful API for the Home254 Kenyan property marketplace. Built with Node.js, Express, MongoDB (Frankfurt region), and OpenRouter AI for intelligent property search.

🔗 **Live API Base URL:** `https://home254.onrender.com`

---

## ⚠️ Infrastructure Reality (Free Tier)

This backend runs on **Render's free tier** with **MongoDB Atlas (Frankfurt)**. Both have constraints that affect performance:

| Constraint | Impact |
|------------|--------|
| **Render free tier** | Spins down after 15 minutes of inactivity. First request takes 20-50 seconds to wake up. |
| **MongoDB Frankfurt region** | Database hosted in Germany. Adds ~100-200ms latency for Kenyan requests. |
| **Combined effect** | Cold start + geographic distance = slow first request. Subsequent requests are normal. |

**Why this matters:** This is a real-world constraint of building on a budget. In production with paid tiers, response times would be 5-10x faster.

---

## Overview

This API powers the Home254 real estate platform, handling:

- User authentication (register/login with JWT)
- Property listings (CRUD operations)
- **GPS coordinate-based location filtering**
- AI-powered property search assistant (OpenRouter)
- Cloudinary image uploads
- Secure request handling with rate limiting

The frontend (React) consumes this API to display properties, filter listings, and provide chat assistance.

---

## Tech Stack

| Category | Technology | Note |
|----------|------------|------|
| Runtime | Node.js | |
| Framework | Express.js | |
| Database | MongoDB Atlas | **Frankfurt region** (EU) |
| Hosting | Render | **Free tier** (US / EU) |
| Authentication | JWT (jsonwebtoken) | |
| AI Integration | OpenRouter API (Llama 3.1) | |
| File Uploads | Multer + Cloudinary | |
| Security | Helmet, CORS, Rate Limiting | |
| Logging | Morgan | |
| Environment | dotenv | |

---

## Key Features

- **GPS Coordinate Location** — Properties stored with lat/lng for precise Kenyan geolocation
- **JWT Authentication** — Secure login/register with protected routes
- **Property Management** — Create, read, update, delete property listings
- **AI Chat Assistant** — Natural language property search (e.g., *"3-bedroom apartments under 5M in Nairobi"*)
- **Cloudinary Integration** — Image upload and storage
- **Rate Limiting** — 100 requests per 15 minutes per IP
- **MongoDB Atlas** — Cloud database with Mongoose ODM

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | User registration | No |
| POST | `/api/auth/login` | User login (returns JWT) | No |
| GET | `/api/properties` | Get all properties | No |
| GET | `/api/properties/:id` | Get single property | No |
| POST | `/api/properties` | Add new property | Yes |
| PUT | `/api/properties/:id` | Update property | Yes |
| DELETE | `/api/properties/:id` | Delete property | Yes |
| POST | `/api/chat` | AI property search assistant | Yes |

---

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
OPENROUTER_API_KEY=your_openrouter_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
VITE_APP_URL=http://localhost:3000
⚠️ Never commit .env to GitHub. It's already in .gitignore.

Local Setup
bash
# Clone the repository
git clone https://github.com/Allevandrose/realEstate.git
cd realEstate

# Install dependencies
npm install

# Create .env file and add your variables (see above)

# Start the server
npm start

# Or for development with auto-restart
npm run dev
The server will run at http://localhost:5000

Deployment Architecture
text
Kenyan User
    ↓
Netlify (Frontend) — US region
    ↓
Render (Backend) — Free tier, spins down
    ↓
MongoDB Atlas — Frankfurt (Germany)
Why Frankfurt? Free tier constraints required a specific region. Not ideal for Kenya latency, but functional for demo and learning.

Testing the API
Health Check (when awake)
bash
curl https://home254.onrender.com/api/properties
Get Properties (with filters)
bash
curl "https://home254.onrender.com/api/properties?county=Nairobi&minPrice=1000000&maxPrice=5000000"
Login (to get JWT token)
bash
curl -X POST https://home254.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'
Frontend Repository
The React frontend that consumes this API is available at:

🔗 UI-real-estate

What I Learned
Building this backend taught me:

Structuring a REST API with Express and MongoDB

Implementing JWT authentication securely

Integrating third-party AI APIs (OpenRouter)

Handling file uploads with Multer + Cloudinary

Deploying a Node.js app to Render with environment variables

Geographic latency awareness — MongoDB region choice directly affects Kenyan users

Free tier trade-offs — cold starts, spin-downs, and how to communicate them honestly

Future Improvements
Upgrade to Render paid tier (eliminate cold starts for Kenya users)

Migrate MongoDB to AWS Africa (Cape Town) for lower latency

Add pagination for property listings

Implement refresh tokens for authentication

Add more advanced GPS filtering (e.g., "within 10km of Nairobi CBD")

Write unit tests with Jest

Troubleshooting
Issue	Solution
First request times out	Wait 30-50 seconds. Free tier is waking up.
503 Service Unavailable	The server is spun down. Try again in 30 seconds.
MongoDB connection error	Check that your IP is whitelisted in MongoDB Atlas.
License
This project is open source for portfolio purposes.

Contact
Built by Ibrahim Mulei — ibrahimmulei@gmail.com

GitHub: @Allevandrose
