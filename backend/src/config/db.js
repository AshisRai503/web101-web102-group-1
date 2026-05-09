// Mock in-memory database for development/testing
const users = [];

class MockPool {
  async query(sql, params = []) {
    // INSERT user
    if (sql.includes('INSERT INTO users')) {
      const [email, password, name, role] = params;
      const user = {
        id: users.length + 1,
        email,
        password,
        name,
        role,
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      users.push(user);
      return { rows: [{ id: user.id, email: user.email, name: user.name, role: user.role }] };
    }

    // SELECT user by email
    if (sql.includes('SELECT * FROM users WHERE email')) {
      const [email] = params;
      const user = users.find((u) => u.email === email);
      return { rows: user ? [user] : [] };
    }

    // SELECT user by id
    if (sql.includes('SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id')) {
      const [id] = params;
      const user = users.find((u) => u.id === id);
      if (!user) return { rows: [] };
      const { password, ...userWithoutPassword } = user;
      return { rows: [userWithoutPassword] };
    }

    // UPDATE avatar
    if (sql.includes('UPDATE users SET avatar_url')) {
      const [avatarUrl, id] = params;
      const user = users.find((u) => u.id === id);
      if (!user) return { rows: [] };
      user.avatar_url = avatarUrl;
      user.updated_at = new Date();
      const { password, ...userWithoutPassword } = user;
      return { rows: [userWithoutPassword] };
    }

    // CREATE TABLE (for migrations)
    if (sql.includes('CREATE TABLE')) {
      return { rows: [] };
    }

    return { rows: [] };
  }

  on(event, callback) {
    // Mock error handler
  }
}

const pool = new MockPool();

module.exports = pool;
