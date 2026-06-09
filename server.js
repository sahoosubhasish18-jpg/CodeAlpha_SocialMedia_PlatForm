const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const dbFile = path.join(__dirname, 'social.db');
const db = new sqlite3.Database(dbFile);
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

function initDb() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      bio TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, post_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(post_id) REFERENCES posts(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id),
      FOREIGN KEY(follower_id) REFERENCES users(id),
      FOREIGN KEY(following_id) REFERENCES users(id)
    )`);
  });
}

function handleDbError(res, err) {
  console.error(err);
  res.status(500).json({ error: 'Database error' });
}

app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, bio, created_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return handleDbError(res, err);
    res.json(rows);
  });
});

app.post('/api/users', (req, res) => {
  const { username, bio } = req.body;
  if (!username) return res.status(400).json({ error: 'Username is required.' });

  const stmt = db.prepare('INSERT INTO users (username, bio) VALUES (?, ?)');
  stmt.run(username.trim(), bio || '', function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Username already exists.' });
      }
      return handleDbError(res, err);
    }
    res.status(201).json({ id: this.lastID, username, bio: bio || '' });
  });
  stmt.finalize();
});

app.get('/api/posts', (req, res) => {
  const sql = `SELECT p.id, p.content, p.created_at, p.user_id, u.username,
    IFNULL(l.like_count, 0) AS likes,
    IFNULL(c.comment_count, 0) AS comments
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS like_count FROM likes GROUP BY post_id
  ) l ON l.post_id = p.id
  LEFT JOIN (
    SELECT post_id, COUNT(*) AS comment_count FROM comments GROUP BY post_id
  ) c ON c.post_id = p.id
  ORDER BY p.created_at DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) return handleDbError(res, err);
    res.json(rows);
  });
});

app.post('/api/posts', (req, res) => {
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: 'user_id and content are required.' });

  const stmt = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)');
  stmt.run(user_id, content.trim(), function (err) {
    if (err) return handleDbError(res, err);
    res.status(201).json({ id: this.lastID, user_id, content });
  });
  stmt.finalize();
});

app.get('/api/posts/:postId/comments', (req, res) => {
  const postId = Number(req.params.postId);
  db.all(
    `SELECT c.id, c.content, c.created_at, c.user_id, u.username
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ?
     ORDER BY c.created_at ASC`,
    [postId],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    }
  );
});

app.post('/api/posts/:postId/comments', (req, res) => {
  const postId = Number(req.params.postId);
  const { user_id, content } = req.body;
  if (!user_id || !content) return res.status(400).json({ error: 'user_id and content are required.' });

  const stmt = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)');
  stmt.run(postId, user_id, content.trim(), function (err) {
    if (err) return handleDbError(res, err);
    res.status(201).json({ id: this.lastID, post_id: postId, user_id, content });
  });
  stmt.finalize();
});

app.post('/api/posts/:postId/like', (req, res) => {
  const postId = Number(req.params.postId);
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required.' });

  db.get('SELECT id FROM likes WHERE user_id = ? AND post_id = ?', [user_id, postId], (err, row) => {
    if (err) return handleDbError(res, err);
    if (row) {
      db.run('DELETE FROM likes WHERE id = ?', [row.id], function (deleteErr) {
        if (deleteErr) return handleDbError(res, deleteErr);
        res.json({ message: 'Post unliked.' });
      });
    } else {
      const stmt = db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)');
      stmt.run(user_id, postId, function (insertErr) {
        if (insertErr) return handleDbError(res, insertErr);
        res.json({ message: 'Post liked.' });
      });
      stmt.finalize();
    }
  });
});

app.post('/api/users/:userId/follow', (req, res) => {
  const followingId = Number(req.params.userId);
  const { follower_id } = req.body;
  if (!follower_id) return res.status(400).json({ error: 'follower_id is required.' });
  if (follower_id === followingId) return res.status(400).json({ error: 'Cannot follow yourself.' });

  db.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [follower_id, followingId], (err, row) => {
    if (err) return handleDbError(res, err);
    if (row) {
      db.run('DELETE FROM follows WHERE id = ?', [row.id], function (deleteErr) {
        if (deleteErr) return handleDbError(res, deleteErr);
        res.json({ message: 'Unfollowed successfully.' });
      });
    } else {
      const stmt = db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)');
      stmt.run(follower_id, followingId, function (insertErr) {
        if (insertErr) return handleDbError(res, insertErr);
        res.json({ message: 'Followed successfully.' });
      });
      stmt.finalize();
    }
  });
});

app.get('/api/users/:userId/followers', (req, res) => {
  const userId = Number(req.params.userId);
  db.all(
    `SELECT u.id, u.username, u.bio
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    }
  );
});

app.get('/api/users/:userId/following', (req, res) => {
  const userId = Number(req.params.userId);
  db.all(
    `SELECT u.id, u.username, u.bio
     FROM follows f
     JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return handleDbError(res, err);
      res.json(rows);
    }
  );
});

app.get('/api/users/:userId', (req, res) => {
  const userId = Number(req.params.userId);
  db.get('SELECT id, username, bio, created_at FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) return handleDbError(res, err);
    if (!row) return res.status(404).json({ error: 'User not found.' });
    res.json(row);
  });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb();
app.listen(PORT, () => {
  console.log(`Mini social app backend running on http://localhost:${PORT}`);
});
