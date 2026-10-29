/**
 * Auth Client Service for ForeSight
 * Integrates frontend with Express + MongoDB authentication endpoints.
 */
(function () {
  // Use 127.0.0.1 by default to prevent IPv6 localhost resolution mismatch on Windows
  const DEFAULT_API = 'http://127.0.0.1:5000/api';

  const Auth = {
    getApiUrl: function () {
      return localStorage.getItem('irp_api_url') || DEFAULT_API;
    },

    setApiUrl: function (url) {
      localStorage.setItem('irp_api_url', url);
    },

    getToken: function () {
      return localStorage.getItem('irp_token');
    },

    getUser: function () {
      try {
        const u = localStorage.getItem('irp_user');
        return u ? JSON.parse(u) : null;
      } catch (e) {
        return null;
      }
    },

    isAuthenticated: function () {
      return !!this.getToken();
    },

    setSession: function (token, user) {
      localStorage.setItem('irp_token', token);
      localStorage.setItem('irp_user', JSON.stringify(user));
    },

    logout: function () {
      localStorage.removeItem('irp_token');
      localStorage.removeItem('irp_user');
      window.location.href = 'login.html';
    },

    /**
     * Resilient fetch helper that tries both 127.0.0.1 and localhost
     */
    _fetchAuth: async function (endpoint, body) {
      const primaryUrl = `${this.getApiUrl()}${endpoint}`;
      
      // Determine alternative host (127.0.0.1 <-> localhost) for retry
      let alternateUrl = null;
      if (primaryUrl.includes('127.0.0.1')) {
        alternateUrl = primaryUrl.replace('127.0.0.1', 'localhost');
      } else if (primaryUrl.includes('localhost')) {
        alternateUrl = primaryUrl.replace('localhost', '127.0.0.1');
      }

      let res;
      try {
        res = await fetch(primaryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (err) {
        // If primary failed, attempt alternate
        if (alternateUrl) {
          try {
            res = await fetch(alternateUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            // Alternate succeeded, remember this working URL format
            if (alternateUrl.includes('localhost')) {
              this.setApiUrl('http://localhost:5000/api');
            } else {
              this.setApiUrl('http://127.0.0.1:5000/api');
            }
          } catch (retryErr) {
            throw new Error('Backend server is not running on port 5000. Start it in terminal with: cd server; npm run dev');
          }
        } else {
          throw new Error('Could not connect to backend server at ' + primaryUrl + '. Please ensure your server is running.');
        }
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication failed.');
      }
      return data;
    },

    login: async function (email, password) {
      const data = await this._fetchAuth('/auth/login', { email, password });
      this.setSession(data.token, data.user);
      return data;
    },

    register: async function (name, email, password) {
      const data = await this._fetchAuth('/auth/register', { name, email, password });
      this.setSession(data.token, data.user);
      return data;
    },

    initNavbar: function () {
      const navLinks = document.querySelector('.nav-links');
      const user = this.getUser();

      if (navLinks) {
        const existingAuthItem = document.getElementById('nav-auth-item');
        if (existingAuthItem) existingAuthItem.remove();

        const li = document.createElement('li');
        li.id = 'nav-auth-item';

        if (user && this.isAuthenticated()) {
          li.innerHTML = `
            <div class="nav-user-badge">
              <span>👤 ${escapeHtml(user.name)}</span>
              <button class="nav-logout-btn" id="btn-nav-logout" type="button" title="Log out">Logout</button>
            </div>
          `;
          setTimeout(() => {
            const logoutBtn = document.getElementById('btn-nav-logout');
            if (logoutBtn) {
              logoutBtn.addEventListener('click', () => {
                Auth.logout();
              });
            }
          }, 0);
        } else {
          li.innerHTML = `<a href="login.html">Login</a>`;
        }

        navLinks.appendChild(li);
      }
    },
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[m];
    });
  }

  window.Auth = Auth;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.initNavbar());
  } else {
    Auth.initNavbar();
  }
})();
