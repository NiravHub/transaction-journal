
    // DOM Elements
    const transactionsList = document.getElementById('transactionsList');
    const searchInput = document.getElementById('searchInput');
    const addBtn = document.getElementById('addBtn');
    const formModal = document.getElementById('formModalOld');
    const detailModal = document.getElementById('detailModal');
    const transactionForm = document.getElementById('transactionForm');
    const closeFormModal = document.getElementById('closeFormModalOld');
    const closeDetailModal = document.getElementById('closeDetailModal');
    const cancelForm = document.getElementById('cancelForm');
    const imageInput = document.getElementById('image');
    const imagePreview = document.getElementById('imagePreview');
    const fileName = document.getElementById('fileName');
    const datetimeInput = document.getElementById('datetime');
    const toast = document.getElementById('toast');
    const paymentMethodSelect = document.getElementById('payment_method');
    const otherPaymentGroup = document.getElementById('other_payment_group');
    const otherPaymentMethod = document.getElementById('other_payment_method');
    const modalTitle = document.getElementById('pageFormTitle');
    const submitBtn = document.querySelector('#transactionForm button[type="submit"]');
    const transactionTypeInput = document.getElementById('transaction_type');
    const spentBtn = document.getElementById('spentBtn');
    const receivedBtn = document.getElementById('receivedBtn');
    const spentOnlyFields = document.getElementById('spentOnlyFields');

    // Transaction Type Toggle
    function setTransactionType(type) {
      transactionTypeInput.value = type;

      if (type === 'spent') {
        spentBtn.classList.add('active');
        receivedBtn.classList.remove('active');
        spentOnlyFields.style.display = 'block';
        document.getElementById('locationGroup').style.display = 'block';
        // Set payment_method as required
        document.getElementById('payment_method').required = true;
      } else {
        spentBtn.classList.remove('active');
        receivedBtn.classList.add('active');
        spentOnlyFields.style.display = 'block';
        document.getElementById('locationGroup').style.display = 'none';
        // Remove required from payment_method for received transactions
        document.getElementById('payment_method').required = true;
        document.getElementById('other_payment_group').style.display = 'none';
        document.getElementById('location').value = '';
      }
      formHasChanges = true;
    }

    if (spentBtn && receivedBtn) {
      spentBtn.addEventListener('click', () => setTransactionType('spent'));
      receivedBtn.addEventListener('click', () => setTransactionType('received'));
    }

    // Custom payment method dropdown
const paymentTrigger = document.getElementById('paymentTrigger');
const paymentOptions = document.getElementById('paymentOptions');
const paymentSelected = document.getElementById('paymentSelected');
const paymentInput = document.getElementById('payment_method');

paymentTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  paymentTrigger.classList.toggle('open');
  paymentOptions.classList.toggle('open');
});

document.querySelectorAll('.custom-option').forEach(option => {
  option.addEventListener('click', () => {
    const value = option.dataset.value;
    paymentInput.value = value;
    paymentSelected.textContent = value;
    paymentSelected.style.color = 'var(--text-primary)';
    paymentTrigger.classList.remove('open');
    paymentOptions.classList.remove('open');

    // Remove selected class from all, add to current
    document.querySelectorAll('.custom-option').forEach(o => 
      o.classList.remove('selected'));
    option.classList.add('selected');

    // Handle "Other" field visibility
    if (value === 'Other') {
      otherPaymentGroup.style.display = 'block';
      otherPaymentMethod.required = true;
    } else {
      otherPaymentGroup.style.display = 'none';
      otherPaymentMethod.required = false;
      otherPaymentMethod.value = '';
    }
    formHasChanges = true;
  });
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  paymentTrigger.classList.remove('open');
  paymentOptions.classList.remove('open');
});

    let transactions = [];
    let searchTimeout = null;
    let editingTransactionId = null;
    let formHasChanges = false;
    let isSaving = false;

    const PAGE_TITLES = {
      dashboard: 'Dashboard - Transaction Journal',
      'add-transaction': 'Add Transaction - Transaction Journal',
      transactions: 'Transactions - Transaction Journal',
      profile: 'Profile - Transaction Journal',
      about: 'About - Transaction Journal'
    };

    const ROUTE_MAP = {
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/add-transaction': 'add-transaction',
      '/transactions': 'transactions',
      '/profile': 'profile',
      '/about': 'about'
    };

    let currentPage = null;

    // Initialize
    document.addEventListener('DOMContentLoaded', async () => {
      await checkAuth();
      setDefaultDateTime();
      setupNavigation();
      setupMobileMenu();
      await loadYearFilter();
      showPage(getPageFromPath());
    });

    function getPageFromPath() {
      return ROUTE_MAP[window.location.pathname] || 'dashboard';
    }

    function setupNavigation() {
      document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (currentPage === 'add-transaction' && formHasChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
              return;
            }
          }
          if (link.dataset.page === 'add-transaction') {
            resetAddForm();
          }
          navigateTo(link.dataset.page);
        });
      });

      window.addEventListener('popstate', () => {
        if (currentPage === 'add-transaction' && formHasChanges) {
          if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
            history.pushState({ page: 'add-transaction' }, '', '/add-transaction');
            return;
          }
        }
        showPage(getPageFromPath());
      });
    }

    function setupMobileMenu() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      const menuBtn = document.getElementById('mobileMenuBtn');

      menuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
      });

      overlay.addEventListener('click', closeMobileMenu);
    }

    function closeMobileMenu() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('active');
    }

    function navigateTo(page) {
      const path = page === 'dashboard' ? '/' : '/' + page;
      history.pushState({ page }, '', path);
      showPage(page);
    }

    function showPage(page) {
      currentPage = page;

      document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById('page-' + page).classList.add('active');

      document.querySelectorAll('.sidebar-nav-item[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
      });

      addBtn.style.display = (page === 'transactions') ? '' : 'none';
      document.title = PAGE_TITLES[page] || 'Transaction Journal';

      closeMobileMenu();

      console.log('showPage start:', page);
      if (page === 'dashboard') {
        console.log('showPage: dashboard selected, loading profile...');
        loadProfile().then(() => console.log('showPage: dashboard loadProfile completed')).catch(err => console.error('showPage: dashboard loadProfile error', err));
      } else if (page === 'profile') {
        console.log('showPage: profile selected, loading profile...');
        loadProfile().then(() => console.log('showPage: profile loadProfile completed')).catch(err => console.error('showPage: profile loadProfile error', err));
      } else if (page === 'transactions') {
        console.log('showPage: transactions selected, fetching transactions...');
        fetchTransactions(searchInput.value);
      }
      console.log('showPage end:', page);
    }

    async function loadProfile() {
      console.log('loadProfile start:', currentPage);
      const dashboardContent = document.getElementById('dashboardContent');
      const profileContent = document.getElementById('profileContent');

      try {
        console.log('loadProfile: fetching /api/auth/profile');
        const response = await fetch('/api/auth/profile', { cache: 'no-store' });
        console.log('loadProfile: response status', response.status, 'ok', response.ok);

        if (!response.ok) {
          if (response.status === 401) {
            console.log('loadProfile: unauthorized, redirecting to login');
            window.location.href = '/login';
            return;
          }
          throw new Error('Failed to load profile');
        }

        const data = await response.json();
        const {user, stats, paymentMethods} = data;
        const paymentMethodHTML =
        paymentMethods.length > 0
        ? paymentMethods.map(pm => `
        <div style="
          display:flex;
          justify-content:space-between;
          padding:10px 0;
          border-bottom:1px solid rgba(255,255,255,0.08);
        ">
          <span>${pm.payment_method}</span>
          <span>
            ₹${parseFloat(pm.total_amount).toFixed(2)}
            (${pm.transaction_count})
          </span>
        </div>
        `).join('')
        : '<p>No payment data available.</p>';
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        if (currentPage === 'dashboard') {
          if (!dashboardContent) {
            console.warn('loadProfile: dashboardContent not found');
          }
          if (dashboardContent) {
            console.log('loadProfile: rendering dashboard content');
            dashboardContent.innerHTML = `
        <div class="dashboard-content">
            <div class="dashboard-hero">
                <div class="hero-text">
                    <h1 class="page-title">Welcome back 👋</h1>

                    <p class="dashboard-subtitle">
                        Hello,
                        <strong>${escapeHtml(user.name)}</strong><br>
                        Here's an overview of your finances.
                    </p>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">📄</div>

                    <div class="stat-value">
                        ${stats.transactionCount}
                    </div>

                    <div class="stat-label">
                        Transactions
                    </div>
                </div>

                <div class="stat-card danger">
                    <div class="stat-icon">💸</div>

                    <div class="stat-value">
                        ₹${(stats.totalSpent ?? 0).toFixed(2)}
                    </div>

                    <div class="stat-label">
                        Total Spent
                    </div>
                </div>

                <div class="stat-card success">
                    <div class="stat-icon">💰</div>

                    <div class="stat-value">
                        ₹${(stats.totalReceived ?? 0).toFixed(2)}
                    </div>

                    <div class="stat-label">
                        Total Received
                    </div>
                </div>
            </div>

            <div class="payment-summary-card">
                <h3>💳 Payment Method Summary</h3>

                <div id="paymentMethodSummary">
                    ${paymentMethodHTML}
                </div>
            </div>

            <div class="dashboard-actions-section">
                <h3>Quick Actions</h3>

                <div class="dashboard-actions">
                    <button class="btn btn-primary" id="dashAddBtn">
                        + Add Transaction
                    </button>

                    <button class="btn btn-secondary" id="dashViewBtn">
                        View Transactions
                    </button>

                    <button class="btn btn-secondary" id="dashProfileBtn">
                        View Profile
                    </button>
                </div>
            </div>
        </div>
    `;
    console.log('loadProfile: dashboard innerHTML assigned');

    document.getElementById('dashAddBtn').addEventListener('click', () => {
        resetAddForm();
        navigateTo('add-transaction');
    });
    document.getElementById('dashViewBtn').addEventListener('click', () => {
        navigateTo('transactions');
    });
    document.getElementById('dashProfileBtn').addEventListener('click', () => {
        navigateTo('profile');
    });
   } else if (currentPage === 'profile') {
          if (!profileContent) {
            console.warn('loadProfile: profileContent not found');
          }
          if (profileContent) {
            console.log('loadProfile: rendering profile content');
            profileContent.innerHTML = `
            <div class="profile-card">
              <div class="profile-header">
                <div class="avatar">${initials}</div>
                <div class="profile-info">
                  <h2>${escapeHtml(user.name)}</h2>
                  <div class="username">@${escapeHtml(user.username)}${user.username === 'demo' ? '<span class="demo-badge">Demo Account</span>' : ''}</div>
                </div>
              </div>

              <div class="profile-field">
                <span class="field-label">Name</span>
                <span class="field-value">${escapeHtml(user.name)}</span>
              </div>

              <div class="profile-field">
                <span class="field-label">Username</span>
                <span class="field-value">${escapeHtml(user.username)}</span>
              </div>

              <div class="profile-field">
                <span class="field-label">Member Since</span>
                <span class="field-value">${formatProfileDate(user.created_at)}</span>
              </div>
            </div>
          `;
          console.log('loadProfile: rendered profile content');
        }
      }
    }
  } catch (err) {
      console.error('Dashboard Error:', err);
      if (currentPage === 'dashboard' && dashboardContent) {
        dashboardContent.innerHTML = '<div class="loading">Error loading dashboard.</div>';
      } else if (currentPage === 'profile' && profileContent) {
        profileContent.innerHTML = '<div class="loading">Error loading profile.</div>';
      }
    }
  }

    function formatProfileDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Check authentication
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          window.location.href = '/login';
          return;
        }
      } catch (error) {
        window.location.href = '/login';
      }
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (error) {
        console.error('Logout failed:', error);
      }
    });

    // Set default datetime to now
    function setDefaultDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localTime = new Date(now.getTime() - offset * 60000);
  const localISOString = localTime.toISOString().slice(0, 16);
  datetimeInput.value = localISOString;
  datetimeInput.max = localISOString;
}

    // Fetch all transactions
    async function fetchTransactions(search = '') {
    const transactionType = document.getElementById('transactionTypeFilter').value; 
    const paymentMethod = document.getElementById('paymentMethodFilter').value;
    const month = document.getElementById('monthFilter').value;
    const year = document.getElementById('yearFilter').value;
      try {
        let url = '/api/transactions';
        if (search) {
          url += '?search=' + encodeURIComponent(search);
        }
        if (transactionType !== 'all') {
            url += (url.includes('?') ? '&' : '?') +
         'transactionType=' + transactionType;
        }     
        if (paymentMethod !== 'all') {
            url += (url.includes('?') ? '&' : '?') +
         'paymentMethod=' + paymentMethod;
        }
        if (month !== 'all') {
            url += (url.includes('?') ? '&' : '?') +
           'month=' + month;
        }
        if (year !== 'all') {
            url += (url.includes('?') ? '&' : '?') +
           'year=' + year;
        }
        const response = await fetch(url);
        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = '/login';
            return;
          }
          throw new Error('Failed to fetch');
        }
        transactions = await response.json();
        renderTransactions();
      } catch (error) {
        console.error('Error fetching transactions:', error);
        showToast('Failed to load transactions', 'error');
      }
    }
    
    async function loadYearFilter() {
    try {
        const response = await fetch('/api/transactions/years');

        if (!response.ok) {
            throw new Error('Failed to load years');
        }

        const years = await response.json();

        const yearFilter = document.getElementById('yearFilter');

        yearFilter.innerHTML = `
            <option value="all">All Years</option>
        `;

        years.forEach(y => {
            yearFilter.innerHTML += `
                <option value="${y.year}">
                    ${y.year}
                </option>
            `;
        });

    } catch (err) {
        console.error(err);
    }
}
    // Render transactions list
    function renderTransactions() {
  if (transactions.length === 0) {
    transactionsList.innerHTML = `
      <div class="empty-state">
        <h2>No transactions yet</h2>
        <p>Click "Add Transaction" to get started</p>
      </div>
    `;
    return;
  }

  // Group transactions by month
  const groups = {};
  transactions.forEach(t => {
    const date = new Date(t.datetime);
    const key = date.toLocaleDateString('en-IN', { 
      month: 'long', 
      year: 'numeric' 
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  transactionsList.innerHTML = Object.entries(groups).map(([month, txns]) => `
    <div class="month-group">
      <div class="month-heading">${month}</div>
      ${txns.map(t => {
        const txType = t.transaction_type || 'spent';
        const typeEmoji = txType === 'received' ? '💰' : '💸';
        const typeLabel = txType === 'received' ? 'Received' : 'Spent';
        return `
        <div class="transaction-card" data-id="${t.id}">
          <div class="transaction-header">
            <div class="transaction-title">${escapeHtml(t.title)}<span class="type-badge ${txType}">${typeEmoji} ${typeLabel}</span></div>
            <div class="transaction-amount">${formatAmount(t.amount)}</div>
          </div>
          <div class="transaction-meta">
            <span>${formatDate(t.datetime)}</span>
            ${txType === 'spent' ? `<span class="payment-badge ${getPaymentBadgeClass(t.payment_method)}">${t.payment_method}</span>` : ''}
            ${t.location && txType === 'spent' ? `<span>${escapeHtml(t.location)}</span>` : ''}
            ${t.image_url ? '<span class="has-image">Has Image</span>' : ''}
          </div>
        </div>
      `;
    }).join('')}
    </div>
  `).join('');

  // Re-attach click handlers
  document.querySelectorAll('.transaction-card').forEach(card => {
    card.addEventListener('click', () => showTransactionDetail(card.dataset.id));
  });
}

    // Format amount with currency
    function formatAmount(amount) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }).format(amount);
    }

    // Format date
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Get payment badge class
    function getPaymentBadgeClass(paymentMethod) {
      const classes = {
        'GPay': 'gpay',
        'PhonePe': 'phonepe',
        'Paytm': 'paytm',
        'BHIM': 'bhim'
      };
      return classes[paymentMethod] || 'other';
    }

    // Escape HTML
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Search functionality
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        fetchTransactions(e.target.value);
      }, 300);
    });
    
    document.getElementById('transactionTypeFilter').addEventListener('change', () => {
    fetchTransactions(searchInput.value);
    });
    document.getElementById('paymentMethodFilter').addEventListener('change', () => {
    fetchTransactions(searchInput.value);
    });
    document.getElementById('monthFilter').addEventListener('change', () => {
    fetchTransactions(searchInput.value);
    });
    document.getElementById('yearFilter').addEventListener('change', () => {
    fetchTransactions(searchInput.value);
    });
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    document.getElementById('transactionTypeFilter').value = 'all';
    document.getElementById('paymentMethodFilter').value = 'all';
    document.getElementById('monthFilter').value = 'all';
    document.getElementById('yearFilter').value = 'all';
    fetchTransactions('');
    });


    function resetAddForm() {
      editingTransactionId = null;
      setDefaultDateTime();
      transactionForm.reset();
      imagePreview.classList.remove('show');
      fileName.textContent = '';
      otherPaymentMethod.value = '';
      otherPaymentGroup.style.display = 'none';
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Save Transaction';
      if (document.getElementById('pageFormTitle')) {
        document.getElementById('pageFormTitle').textContent = 'Add Transaction';
      }
      formHasChanges = false;

      // Reset transaction type to 'spent'
      setTransactionType('spent');

      const paymentSelected = document.getElementById('paymentSelected');
      if (paymentSelected) {
        paymentSelected.textContent = 'Select payment method';
        paymentSelected.style.color = '';
      }
      document.querySelectorAll('.custom-option').forEach(o => o.classList.remove('selected'));
    }

    // Open add page
    addBtn.addEventListener('click', () => {
      resetAddForm();
      navigateTo('add-transaction');
    });

    // Payment method change handler
    paymentMethodSelect.addEventListener('change', () => {
      if (paymentMethodSelect.value === 'Other') {
        otherPaymentGroup.style.display = 'block';
        otherPaymentMethod.required = true;
      } else {
        otherPaymentGroup.style.display = 'none';
        otherPaymentMethod.required = false;
        otherPaymentMethod.value = '';
      }
      formHasChanges = true;
    });

    // Open modal helper
    function openModal(modal) {
      document.body.style.overflow = 'hidden';
      modal.classList.add('active');
    }

    // Close modals
    function closeModal(modal) {
      if (modal === formModal && formHasChanges) {
        if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
          return;
        }
      }
      modal.classList.add('closing');
      setTimeout(() => {
        modal.classList.remove('active', 'closing');
        document.body.style.overflow = '';
        formHasChanges = false;
      }, 200);
    }

    closeFormModal.addEventListener('click', () => closeModal(formModal));
    closeDetailModal.addEventListener('click', () => closeModal(detailModal));
    
    cancelForm.addEventListener('click', (e) => {
      e.preventDefault();
      if (formHasChanges) {
        if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
          return;
        }
      }
      formHasChanges = false;
      navigateTo('transactions');
    });

    // Close on overlay click
    formModal.addEventListener('click', (e) => {
      if (e.target === formModal) closeModal(formModal);
    });
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) closeModal(detailModal);
    });

    // Image preview
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        fileName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.src = e.target.result;
          imagePreview.classList.add('show');
        };
        reader.readAsDataURL(file);
      } else {
        fileName.textContent = '';
        imagePreview.classList.remove('show');
      }
    });

    // Form submission
    transactionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (isSaving) return;
      isSaving = true;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span>Saving...';

      const formData = new FormData();
      formData.append('title', document.getElementById('title').value);
      formData.append('amount', document.getElementById('amount').value);
      formData.append('datetime', document.getElementById('datetime').value);
      formData.append('transaction_type', transactionTypeInput.value);
      formData.append('notes', document.getElementById('notes').value);

      // Only include payment method and location for 'spent' transactions
      // Always send payment method
      formData.append('payment_method', document.getElementById('payment_method').value);

      // Location is optional
      formData.append('location', document.getElementById('location').value);

      // Custom payment method
if (paymentMethodSelect.value === 'Other') {
  formData.append('other_payment_method', otherPaymentMethod.value);
}

      const imageFile = imageInput.files[0];
      if (imageFile) {
        formData.append('image', imageFile);
      }

      try {
        let response;
        if (editingTransactionId) {
          response = await fetch('/api/transactions/' + editingTransactionId, {
            method: 'PUT',
            body: formData
          });
        } else {
          response = await fetch('/api/transactions', {
            method: 'POST',
            body: formData
          });
        }

        if (response.ok) {
          formHasChanges = false;
          showToast('Transaction saved successfully', 'success');
          navigateTo('transactions');
        } else if (response.status === 401) {
          window.location.href = '/login';
        } else if (response.status === 409) {
          showToast('Duplicate transaction detected', 'error');
        } else {
          const error = await response.json();
          showToast(error.error || 'Failed to save transaction', 'error');
        }
      } catch (error) {
        console.error('Error saving transaction:', error);
        showToast('Failed to save transaction', 'error');
      } finally {
        isSaving = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Save Transaction';
      }
    });

    // Track form changes for unsaved warning
    transactionForm.addEventListener('input', () => {
      formHasChanges = true;
    });

    // Show transaction detail
    async function showTransactionDetail(id) {
      try {
        const response = await fetch('/api/transactions/' + id);
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        const transaction = await response.json();

        if (!transaction || transaction.error) {
          showToast('Transaction not found', 'error');
          return;
        }

        const detailBody = document.getElementById('detailBody');
        const txType = transaction.transaction_type || 'spent';
        const typeEmoji = txType === 'received' ? '💰' : '💸';
        const typeLabel = txType === 'received' ? 'Received' : 'Spent';
        detailBody.innerHTML = `
          <div class="detail-row">
            <div class="detail-label">Title</div>
            <div class="detail-value">${escapeHtml(transaction.title)} <span class="type-badge ${txType}">${typeEmoji} ${typeLabel}</span></div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Amount</div>
            <div class="detail-value" style="color: var(--success); font-weight: 700; font-size: 1.2rem;">${formatAmount(transaction.amount)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Date & Time</div>
            <div class="detail-value">${formatDate(transaction.datetime)}</div>
          </div>
          ${txType === 'spent' ? `
          <div class="detail-row">
            <div class="detail-label">Payment</div>
            <div class="detail-value"><span class="payment-badge ${getPaymentBadgeClass(transaction.payment_method)}">${transaction.payment_method}</span></div>
          </div>
          ${transaction.location ? `
          <div class="detail-row">
            <div class="detail-label">Location</div>
            <div class="detail-value">${escapeHtml(transaction.location)}</div>
          </div>
          ` : ''}
          ` : ''}
          ${transaction.notes ? `
          <div class="detail-row">
            <div class="detail-label">Notes</div>
            <div class="detail-value">${escapeHtml(transaction.notes)}</div>
          </div>
          ` : ''}
          ${transaction.image_url ? `
          <div class="detail-row">
            <div class="detail-label">Image</div>
            <div class="detail-value">
              <img class="detail-image" src="${transaction.image_url}" alt="Transaction image">
            </div>
          </div>
          ` : ''}
          <div class="modal-actions">
            <button class="btn btn-edit" id="editTransaction" data-id="${transaction.id}">Edit</button>
            <button class="btn btn-danger" id="deleteTransaction" data-id="${transaction.id}">Delete</button>
            <button class="btn btn-secondary" onclick="closeModal(detailModal)">Close</button>
          </div>
        `;

        // Add edit handler
        document.getElementById('editTransaction').addEventListener('click', () => {
          closeModal(detailModal);
          openEditModal(transaction);
        });

        // Add delete handler
        document.getElementById('deleteTransaction').addEventListener('click', () => deleteTransaction(transaction.id));

        openModal(detailModal);
      } catch (error) {
        console.error('Error loading transaction:', error);
        showToast('Failed to load transaction details', 'error');
      }
    }

    // Open edit page with pre-filled data
    function openEditModal(transaction) {
      editingTransactionId = transaction.id;

      document.getElementById('title').value = transaction.title;
      document.getElementById('amount').value = transaction.amount;
      document.getElementById('datetime').value = transaction.datetime;
      document.getElementById('location').value = transaction.location || '';
      document.getElementById('notes').value = transaction.notes || '';

      // Set transaction type
      const txType = transaction.transaction_type || 'spent';
      setTransactionType(txType);

      // Update custom select trigger text and input value (only for spent)
      // Update custom select trigger text and input value
      {
        const paymentSelected = document.getElementById('paymentSelected');
        const standardOptions = ['GPay', 'POP UPI', 'Paytm', 'BHIM'];

        let finalVal = transaction.payment_method;
        if (standardOptions.includes(transaction.payment_method)) {
          paymentMethodSelect.value = transaction.payment_method;
          otherPaymentGroup.style.display = 'none';
          otherPaymentMethod.required = false;
          otherPaymentMethod.value = '';
        } else {
          paymentMethodSelect.value = 'Other';
          otherPaymentGroup.style.display = 'block';
          otherPaymentMethod.required = true;
          otherPaymentMethod.value = transaction.payment_method;
          finalVal = 'Other';
        }

        if (paymentSelected) {
          paymentSelected.textContent = finalVal;
          paymentSelected.style.color = 'var(--text-primary)';
        }

        // Update selected class in custom dropdown options
        document.querySelectorAll('.custom-option').forEach(opt => {
          opt.classList.toggle('selected', opt.dataset.value === finalVal);
        });
      }

      // Show existing image if any
      if (transaction.image_url) {
        imagePreview.src = transaction.image_url;
        imagePreview.classList.add('show');
        fileName.textContent = 'Current image (upload new to replace)';
      } else {
        imagePreview.classList.remove('show');
        fileName.textContent = '';
      }

      if (document.getElementById('pageFormTitle')) {
        document.getElementById('pageFormTitle').textContent = 'Edit Transaction';
      }
      submitBtn.innerHTML = 'Save Transaction';
      submitBtn.disabled = false;
      formHasChanges = false;

      navigateTo('add-transaction');
    }

    // Delete transaction
    async function deleteTransaction(id) {
      if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
      }

      try {
        const response = await fetch('/api/transactions/' + id, {
          method: 'DELETE'
        });

        if (response.ok) {
          closeModal(detailModal);
          fetchTransactions(searchInput.value);
          if (currentPage === 'profile') loadProfile();
          showToast('Transaction deleted successfully', 'success');
        } else if (response.status === 401) {
          window.location.href = '/login';
        } else {
          showToast('Failed to delete transaction', 'error');
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        showToast('Failed to delete transaction', 'error');
      }
    }

    // Toast notification
    function showToast(message, type = 'success') {
      toast.textContent = message;
      toast.className = 'toast ' + type + ' show';
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(formModal);
        closeModal(detailModal);
      }
    });

    // Unsaved changes warning on page close
    window.addEventListener('beforeunload', (e) => {
      if (formHasChanges && formModal.classList.contains('active')) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  