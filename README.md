# Mini Social Media App

A simple Social Media Web Application built using Node.js, Express.js, SQLite, HTML, CSS, and JavaScript.

## Features

- User Registration
- Create Posts
- View Posts
- Like / Unlike Posts
- Add Comments
- Follow / Unfollow Users
- View Followers & Following
- SQLite Database Integration
- REST API Backend
- Responsive Frontend

---

## Tech Stack

### Backend
- Node.js
- Express.js
- SQLite3
- Body Parser

### Frontend
- HTML
- CSS
- JavaScript

---

## Project Structure

```
mini-social-app/
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── social.db
├── server.js
├── package.json
├── package-lock.json
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone <repository-url>
cd mini-social-app
```

### Install Dependencies

```bash
npm install
```

### Run Application

```bash
npm start
```

Server will run at:

```bash
http://localhost:3000
```

---

## API Endpoints

### Users

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | /api/users | Get all users |
| POST | /api/users | Create user |
| GET | /api/users/:id | Get user by ID |

### Posts

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | /api/posts | Get all posts |
| POST | /api/posts | Create post |

### Comments

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | /api/posts/:postId/comments | Get comments |
| POST | /api/posts/:postId/comments | Add comment |

### Likes

| Method | Endpoint | Description |
|---------|-----------|-------------|
| POST | /api/posts/:postId/like | Like or Unlike a post |

### Follow System

| Method | Endpoint | Description |
|---------|-----------|-------------|
| POST | /api/users/:userId/follow | Follow or Unfollow user |
| GET | /api/users/:userId/followers | Get followers |
| GET | /api/users/:userId/following | Get following users |

### Status

| Method | Endpoint | Description |
|---------|-----------|-------------|
| GET | /api/status | Server health check |

---

## Database Tables

### Users
- id
- username
- bio
- created_at

### Posts
- id
- user_id
- content
- created_at

### Comments
- id
- post_id
- user_id
- content
- created_at

### Likes
- id
- user_id
- post_id
- created_at

### Follows
- id
- follower_id
- following_id
- created_at

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "body-parser": "^1.20.2",
  "sqlite3": "^5.1.6"
}
```

---

## Future Enhancements

- User Authentication
- JWT Authorization
- Password Encryption
- Profile Pictures
- Image Uploads
- Real-Time Notifications
- Messaging System
- Dark Mode
- Mobile Responsive UI

---

## Author

**Subhasish Sahoo**

---

## License

This project is licensed under the MIT License.
