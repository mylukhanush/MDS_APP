/* MDS MART - Admin Central Logic with Order Management */

const API_BASE = "http://127.0.0.1:5000/api";

class AdminPortal {
    constructor() {
        this.authenticated = sessionStorage.getItem('admin_auth') === 'true';
        this.products = [];
        this.orders = [];
        this.currentView = 'products'; // 'products' or 'orders'
        this.init();
    }

    init() {
        if (this.authenticated) {
            this.showDashboard();
        }
    }

    authenticate() {
        const pass = document.getElementById('admin-pass').value;
        if (pass === "admin123") {
            this.authenticated = true;
            sessionStorage.setItem('admin_auth', 'true');
            this.showDashboard();
        } else {
            alert("Unauthorized: Incorrect security key.");
        }
    }

    async switchView(view) {
        this.currentView = view;
        await this.showDashboard();
    }

    async showDashboard() {
        document.getElementById('admin-auth').style.display = 'none';
        const content = document.getElementById('admin-content');
        content.style.display = 'block';

        if (this.currentView === 'products') {
            await this.fetchProducts();
            this.renderProductView(content);
        } else {
            await this.fetchOrders();
            this.renderOrderView(content);
        }
    }

    async fetchProducts() {
        try {
            const response = await fetch(`${API_BASE}/products`);
            this.products = await response.json();
        } catch (error) {
            console.error("Connection failed");
        }
    }

    async fetchOrders() {
        try {
            const response = await fetch(`${API_BASE}/orders`);
            this.orders = await response.json();
        } catch (error) {
            console.error("Order fetch failed");
        }
    }

    renderProductView(content) {
        content.innerHTML = `
            <div class="section-header">
                <div>
                    <h1>Full Inventory Control</h1>
                    <p style="color: var(--text-muted)">Manage products, pricing, and stock visibility</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="auth-btn btn-admin" onclick="admin.switchView('products')" style="opacity: 1;">Products</button>
                    <button class="auth-btn btn-toggle" onclick="admin.switchView('orders')">View Orders</button>
                </div>
            </div>
            
            <div class="admin-grid">
                <div class="admin-form-card">
                    <h3 style="margin-bottom: 20px;">Register New Product</h3>
                    <form onsubmit="admin.addProduct(event)">
                        <div class="form-group">
                            <label>Product Name</label>
                            <input type="text" id="p-name" required placeholder="e.g. Premium Saffron">
                        </div>
                        <div class="form-group">
                            <label>Price (₹)</label>
                            <input type="number" step="0.01" id="p-price" required placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label>Product Image (Photo/Upload)</label>
                            <input type="file" id="p-image" accept="image/*" capture="environment" required>
                        </div>
                        <button type="submit" class="btn-submit">Add to Inventory</button>
                    </form>
                </div>
                
                <div class="admin-table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Stock Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-list">
                            ${this.renderInventory()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderOrderView(content) {
        content.innerHTML = `
            <div class="section-header">
                <div>
                    <h1>Customer Orders</h1>
                    <p style="color: var(--text-muted)">Track incoming orders and delivery details</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="auth-btn btn-toggle" onclick="admin.switchView('products')">Products</button>
                    <button class="auth-btn btn-admin" onclick="admin.switchView('orders')" style="opacity: 1;">Orders</button>
                </div>
            </div>
            
            <div class="admin-table-card">
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Time</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Contact / Address</th>
                            <th>Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.orders.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 40px;">No orders found.</td></tr>' : this.orders.map(o => {
                            const items = JSON.parse(o.items);
                            return `
                                <tr>
                                    <td>#ORD-${o.id}</td>
                                    <td style="font-size: 12px; color: var(--text-muted)">${new Date(o.timestamp).toLocaleString()}</td>
                                    <td>
                                        <div style="font-size: 13px;">
                                            ${items.map(i => `${i.name} (x${i.qty})`).join('<br>')}
                                        </div>
                                    </td>
                                    <td style="font-size: 16px; font-weight: 800; color: var(--primary-blue);">₹${o.total.toFixed(2)}</td>
                                    <td style="font-size: 13px;">
                                        <strong>${o.phone}</strong><br>
                                        <span style="color: var(--text-muted)">${o.address}</span>
                                    </td>
                                    <td>
                                        <span class="stock-badge ${o.payment === 'Cash on Delivery' ? 'in-stock' : 'btn-toggle'}" style="font-size: 10px;">
                                            ${o.payment}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderInventory() {
        return this.products.map(p => `
            <tr>
                <td style="display: flex; align-items: center; gap: 12px;">
                    <img src="${p.image}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
                    <span style="font-weight: 600">${p.name}</span>
                </td>
                <td style="font-weight: 700">₹${parseFloat(p.price).toFixed(2)}</td>
                <td>
                    <span class="stock-badge ${p.inStock ? 'in-stock' : 'out-of-stock'}">
                        ${p.inStock ? 'In Stock' : 'Out Stock'}
                    </span>
                </td>
                <td>
                    <button class="action-btn btn-toggle" onclick="admin.toggleStock(${p.id})">Toggle Stock</button>
                    <button class="action-btn btn-delete" onclick="admin.deleteProduct(${p.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    async addProduct(e) {
        e.preventDefault();
        const name = document.getElementById('p-name').value;
        const price = document.getElementById('p-price').value;
        const imageFile = document.getElementById('p-image').files[0];
        
        if (!imageFile) {
            alert("Please select or capture a photo.");
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('price', price);
        formData.append('image', imageFile);
        
        try {
            const response = await fetch(`${API_BASE}/products`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                await this.showDashboard();
            } else {
                const err = await response.json();
                alert("Upload failed: " + err.error);
            }
        } catch (error) {
            alert("API Error: " + error);
        }
    }

    async toggleStock(id) {
        try {
            const response = await fetch(`${API_BASE}/products/${id}`, {
                method: 'PATCH'
            });
            if (response.ok) {
                await this.showDashboard();
            }
        } catch (error) {
            alert("API Error");
        }
    }

    async deleteProduct(id) {
        if (!confirm('Permanently remove this item?')) return;
        
        try {
            const response = await fetch(`${API_BASE}/products/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await this.showDashboard();
            }
        } catch (error) {
            alert("API Error");
        }
    }
}

const admin = new AdminPortal();
