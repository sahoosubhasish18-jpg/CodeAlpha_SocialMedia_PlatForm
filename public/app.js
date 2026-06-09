const api = {
  users: '/api/users',
  posts: '/api/posts'
};

const userForm = document.getElementById('user-form');
const postForm = document.getElementById('post-form');
const currentUserSelect = document.getElementById('current-user');
const feedElement = document.getElementById('feed');
const postTemplate = document.getElementById('post-template');

let users = [];
let currentUserId = null;

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  return res.json();
}

async function loadUsers() {
  users = await fetchJson(api.users);
  currentUserSelect.innerHTML = users
    .map(user => `<option value="${user.id}">${user.username}</option>`)
    .join('');

  if (users.length && !currentUserId) {
    currentUserId = users[0].id;
  }
  currentUserSelect.value = currentUserId || '';
}

async function loadFeed() {
  const posts = await fetchJson(api.posts);
  feedElement.innerHTML = '';

  if (!posts.length) {
    feedElement.innerHTML = '<p class="small-note">No posts yet. Create your first post!</p>';
    return;
  }

  posts.forEach(post => {
    const node = postTemplate.content.cloneNode(true);
    node.querySelector('.post-author').textContent = post.username;
    node.querySelector('.post-timestamp').textContent = new Date(post.created_at).toLocaleString();
    node.querySelector('.post-content').textContent = post.content;
    node.querySelector('.like-count').textContent = `${post.likes} likes`;
    node.querySelector('.comment-count').textContent = `${post.comments} comments`;

    const likeButton = node.querySelector('.like-button');
    likeButton.textContent = 'Like / Unlike';
    likeButton.addEventListener('click', () => likePost(post.id));

    const followButton = node.querySelector('.follow-button');
    followButton.textContent = 'Follow User';
    followButton.addEventListener('click', () => followUser(post.user_id));

    const commentForm = node.querySelector('.comment-form');
    const commentInput = node.querySelector('.comment-input');
    commentForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!currentUserId) return;
      const content = commentInput.value.trim();
      if (!content) return;
      await fetchJson(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ user_id: currentUserId, content })
      });
      commentInput.value = '';
      renderFeed();
    });

    loadComments(post.id, node.querySelector('.comments'));
    feedElement.appendChild(node);
  });
}

async function loadComments(postId, container) {
  const comments = await fetchJson(`/api/posts/${postId}/comments`);
  container.innerHTML = comments.length
    ? comments.map(comment => `
      <div class="comment">
        <strong>${comment.username}</strong>
        <span>${new Date(comment.created_at).toLocaleString()}</span>
        <p>${comment.content}</p>
      </div>
    `).join('')
    : '<p class="small-note">No comments yet.</p>';
}

async function likePost(postId) {
  if (!currentUserId) return;
  await fetchJson(`/api/posts/${postId}/like`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ user_id: currentUserId })
  });
  renderFeed();
}

async function followUser(userId) {
  if (!currentUserId) return;
  if (Number(userId) === Number(currentUserId)) {
    alert('You cannot follow yourself.');
    return;
  }
  await fetchJson(`/api/users/${userId}/follow`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ follower_id: currentUserId })
  });
  alert('Follow status updated.');
}

async function renderFeed() {
  await loadUsers();
  await loadFeed();
}

userForm.addEventListener('submit', async event => {
  event.preventDefault();
  const username = document.getElementById('username').value.trim();
  const bio = document.getElementById('bio').value.trim();
  if (!username) return;

  await fetchJson(api.users, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username, bio })
  });
  document.getElementById('username').value = '';
  document.getElementById('bio').value = '';
  await renderFeed();
});

postForm.addEventListener('submit', async event => {
  event.preventDefault();
  const content = document.getElementById('post-content').value.trim();
  if (!content || !currentUserId) return;

  await fetchJson(api.posts, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ user_id: currentUserId, content })
  });
  document.getElementById('post-content').value = '';
  await renderFeed();
});

currentUserSelect.addEventListener('change', event => {
  currentUserId = Number(event.target.value);
});

renderFeed();
