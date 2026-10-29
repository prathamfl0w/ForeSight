/**
 * Auth Client Service for ForeSight
 * Integrates frontend with Express + MongoDB authentication endpoints.
 */
(function () {
  const DEFAULT_API = 'http://localhost:5000/api';

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

    login: async function (email, password) {
      const res = await fetch(`${this.getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      this.setSession(data.token, data.user);
      return data;
    },

    register: async function (name, email, password) {
      const res = await fetch(`${this.getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      this.setSession(data.token, data.user);
      return data;
    },

    initNavbar: function () {
      const navLinks = document.querySelector('.nav-links');
      const user = this.getUser();

      if (navLinks) {
        // Remove existing dynamic auth element if any
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

  // Initialize navbar state when document is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.initNavbar());
  } else {
    Auth.initNavbar();
  }
})();

