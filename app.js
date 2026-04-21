/* MDS MART - Customer Experience Logic & Checkout Flow */

const API_BASE = "http://127.0.0.1:5000/api";

class MdsMartApp {
    constructor() {
        this.products = [];
        this.cart = JSON.parse(localStorage.getItem('mds_cart')) || [];
        this.root = document.getElementById('app-root');
        this.modal = document.getElementById('checkout-container');
        this.orderData = null; // Store address details
        this.init();
    }

    async init() {
        await this.fetchProducts();
        this.updateCartBadge();
        this.showProducts();
    }

    async fetchProducts() {
        try {
            const response = await fetch(`${API_BASE}/products`);
            this.products = await response.json();
        } catch (error) {
            console.error("Failed to fetch products:", error);
        }
    }

    updateCartBadge() {
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cart-count').textContent = count;
        localStorage.setItem('mds_cart', JSON.stringify(this.cart));
    }

    updateQuantity(productId, delta) {
        const product = this.products.find(p => p.id === productId);
        if (!product || !product.inStock) return;

        let cartItem = this.cart.find(item => item.id === productId);
        
        if (cartItem) {
            cartItem.quantity += delta;
            if (cartItem.quantity <= 0) {
                this.cart = this.cart.filter(item => item.id !== productId);
            }
        } else if (delta > 0) {
            this.cart.push({ ...product, quantity: 1 });
        }

        this.updateCartBadge();
        this.showProducts(); // Refresh grid
        
        // Refresh modal content without rebuilding the whole overlay
        if (this.modal.innerHTML !== '') {
            const panel = this.modal.querySelector('.checkout-panel');
            const h2 = panel?.querySelector('h2')?.textContent;
            if (h2 === 'Your Shopping Cart') {
                panel.innerHTML = this.renderCartContent();
            }
        }
    }

    addToCart(productId) {
        this.updateQuantity(productId, 1);
    }

    renderCartContent() {
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>Your Shopping Cart</h2>
                <button onclick="app.closeModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            
            <div class="cart-items-list" style="min-height: 200px;">
                ${this.cart.length === 0 ? '<p style="text-align: center; margin-top: 40px; color: var(--text-muted);">Your cart is empty.</p>' : this.cart.map(item => `
                    <div class="cart-item">
                        <img src="${item.image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 700;">${item.name}</div>
                            <div style="color: var(--text-muted); font-size: 14px;">₹${item.price} &times; ${item.quantity}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button onclick="app.updateQuantity(${item.id}, -1)" style="width:24px; height:24px; border:1px solid #ddd; border-radius:4px; cursor:pointer;">-</button>
                            <span style="font-weight: 700; width: 20px; text-align: center;">${item.quantity}</span>
                            <button onclick="app.updateQuantity(${item.id}, 1)" style="width:24px; height:24px; border:1px solid #ddd; border-radius:4px; cursor:pointer;">+</button>
                        </div>
                    </div>
                `).join('')}
            </div>

            ${this.cart.length > 0 ? `
                <div class="cart-total">
                    <span>Total Amount</span>
                    <span>₹${total.toFixed(2)}</span>
                </div>
                <button class="btn-submit" style="margin-top: 32px;" onclick="app.showCheckoutForm()">Proceed to Checkout</button>
            ` : ''}
        `;
    }

    showCart() {
        this.modal.innerHTML = `
            <div class="checkout-overlay" onclick="app.closeModal(event)">
                <div class="checkout-panel">
                    ${this.renderCartContent()}
                </div>
            </div>
        `;
    }

    closeModal(e) {
        if (!e || e.target.classList.contains('checkout-overlay') || e.target.innerHTML === '&times;') {
            this.modal.innerHTML = '';
        }
    }

    showCheckoutForm() {
        const data = this.orderData || { name: '', phone: '', address: '' };
        this.modal.querySelector('.checkout-panel').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>Delivery Address</h2>
                <button onclick="app.showCart()" style="background: none; border: none; color: var(--primary-blue); font-weight: 600; cursor: pointer;">Back</button>
            </div>
            
            <form id="checkout-form" onsubmit="app.showPaymentSelection(event)">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="cust-name" required value="${data.name}" placeholder="Enter your name">
                </div>
                <div class="form-group">
                    <label>Mobile Number</label>
                    <input type="tel" id="cust-phone" required value="${data.phone}" placeholder="10-digit number">
                </div>
                <div class="form-group">
                    <label>Full Delivery Address</label>
                    <textarea id="cust-address" required style="width:100%; min-height: 100px; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-family: inherit;" placeholder="House No, Street, Ward...">${data.address}</textarea>
                </div>
                <button type="submit" class="btn-submit" style="margin-top: 20px;">Continue to Payment</button>
            </form>
        `;
    }

    showPaymentSelection(e) {
        if (e) {
            e.preventDefault();
            this.orderData = {
                name: document.getElementById('cust-name').value,
                phone: document.getElementById('cust-phone').value,
                address: document.getElementById('cust-address').value
            };
        }

        this.modal.querySelector('.checkout-panel').innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2>Select Payment</h2>
                <button onclick="app.showCheckoutForm()" style="background: none; border: none; color: var(--primary-blue); font-weight: 600; cursor: pointer;">Back</button>
            </div>
            
            <div class="payment-options">
                <div class="payment-btn" onclick="app.showPaymentDetails('UPI Payment')">
                    <span style="font-size: 24px;">📱</span>
                    <div><strong>UPI Payment</strong><br><small>GPay, PhonePe, Paytm</small></div>
                </div>
                <div class="payment-btn" onclick="app.showPaymentDetails('Cards')">
                    <span style="font-size: 24px;">💳</span>
                    <div><strong>Cards</strong><br><small>Visa, Mastercard, RuPay</small></div>
                </div>
                <div class="payment-btn" onclick="app.placeOrder('Cash on Delivery')">
                    <span style="font-size: 24px;">💵</span>
                    <div><strong>Cash on Delivery (COD)</strong><br><small>Pay when you receive</small></div>
                </div>
            </div>
        `;
    }

    showPaymentDetails(method) {
        let detailsHtml = '';
        if (method === 'UPI Payment') {
            detailsHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2>UPI Details</h2>
                    <button onclick="app.showPaymentSelection()" style="background: none; border: none; color: var(--primary-blue); font-weight: 600; cursor: pointer;">Back</button>
                </div>
                <form onsubmit="app.placeOrder('UPI Payment', event)">
                    <div class="form-group">
                        <label>UPI ID</label>
                        <input type="text" id="pay-upi" required placeholder="e.g. user@okaxis">
                    </div>
                    <button type="submit" class="btn-submit" style="margin-top: 20px;">Pay Now</button>
                </form>
            `;
        } else if (method === 'Cards') {
            detailsHtml = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2>Card Details</h2>
                    <button onclick="app.showPaymentSelection()" style="background: none; border: none; color: var(--primary-blue); font-weight: 600; cursor: pointer;">Back</button>
                </div>
                <form onsubmit="app.placeOrder('Card Payment', event)">
                    <div class="form-group">
                        <label>Card Number</label>
                        <input type="text" id="pay-card-num" required placeholder="0000 0000 0000 0000" maxlength="16">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="form-group">
                            <label>Expiry Date</label>
                            <input type="text" id="pay-card-exp" required placeholder="MM/YY" maxlength="5">
                        </div>
                        <div class="form-group">
                            <label>CVV</label>
                            <input type="password" id="pay-card-cvv" required placeholder="***" maxlength="3">
                        </div>
                    </div>
                    <button type="submit" class="btn-submit" style="margin-top: 20px;">Pay Now</button>
                </form>
            `;
        }

        this.modal.querySelector('.checkout-panel').innerHTML = detailsHtml;
    }

    async placeOrder(method, e) {
        if (e) e.preventDefault();

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderPayload = {
            items: JSON.stringify(this.cart.map(i => ({ name: i.name, qty: i.quantity }))),
            total: total,
            address: this.orderData ? this.orderData.address : 'COD Order',
            phone: this.orderData ? this.orderData.phone : 'Unknown',
            payment: method
        };

        try {
            const response = await fetch(`${API_BASE}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });

            if (response.ok) {
                this.cart = [];
                this.updateCartBadge();
                this.showSuccessAnimation();
            }
        } catch (error) {
            alert("Order failed to reach server.");
        }
    }

    showSuccessAnimation() {
        this.modal.querySelector('.checkout-panel').innerHTML = `
            <div class="success-screen">
                <div class="checkmark-circle">
                    <div class="checkmark">✓</div>
                </div>
                <h1 style="margin-bottom: 8px;">Order Placed!</h1>
                <p style="color: var(--text-muted); margin-bottom: 32px;">Your provisions are on the way. Thank you for shopping with MDS MART.</p>
                <button class="btn-submit" onclick="app.closeModal()">Continue Shopping</button>
            </div>
        `;
    }

    async showProducts() {
        this.root.innerHTML = `
            <div class="section-header">
                <div>
                    <h1>Premium Collections</h1>
                    <p style="color: var(--text-muted)">Quality provision items for your home</p>
                </div>
                <div class="search-bar">
                    <input type="text" placeholder="Search products..." oninput="app.filterProducts(this.value)" style="max-width: 300px;">
                </div>
            </div>
            <div class="product-grid" id="product-list">
                ${this.renderProductCards(this.products)}
            </div>
        `;
    }

    renderProductCards(products) {
        if (products.length === 0) return '<p>No products available at the moment.</p>';
        return products.map(p => {
            const cartItem = this.cart.find(item => item.id === p.id);
            return `
                <div class="product-card">
                    <img src="${p.image}" alt="${p.name}" class="product-img" onerror="this.src='https://via.placeholder.com/400x300?text=Product+Image'">
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-price">₹${parseFloat(p.price).toFixed(2)}</div>
                        <span class="stock-badge ${p.inStock ? 'in-stock' : 'out-of-stock'}">
                            ${p.inStock ? '● In Stock' : '✕ Out of Stock'}
                        </span>
                        ${p.inStock ? 
                            (cartItem ? `
                                <div class="quantity-control">
                                    <button class="qty-btn" onclick="app.updateQuantity(${p.id}, -1)">-</button>
                                    <span class="qty-value">${cartItem.quantity}</span>
                                    <button class="qty-btn" onclick="app.updateQuantity(${p.id}, 1)">+</button>
                                </div>
                            ` : `
                                <button class="btn-submit" style="margin-top: 16px; padding: 10px; font-size: 14px;" onclick="app.addToCart(${p.id})">Add to Cart</button>
                            `)
                            : ''
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    filterProducts(query) {
        const filtered = this.products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
        document.getElementById('product-list').innerHTML = this.renderProductCards(filtered);
    }
}

const app = new MdsMartApp();
