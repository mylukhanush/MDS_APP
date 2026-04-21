from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import uuid
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

DB_PATH = 'mds_mart.db'
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            image TEXT,
            inStock BOOLEAN NOT NULL DEFAULT 1
        )
    ''')
    
    conn.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            address TEXT NOT NULL,
            phone TEXT NOT NULL,
            payment TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Check if empty, add initial products
    cursor = conn.execute('SELECT COUNT(*) FROM products')
    if cursor.fetchone()[0] == 0:
        initial_products = [
            ("Premium Basmati Rice", 750.00, "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400", 1),
            ("Organic Sunflower Oil", 220.00, "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400", 0),
            ("Farm Fresh Eggs (12pk)", 85.00, "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=400", 1),
            ("Assorted Pulses Pack", 450.00, "https://images.unsplash.com/photo-1515942400420-2b98fed1f515?auto=format&fit=crop&q=80&w=400", 1)
        ]
        conn.executemany('INSERT INTO products (name, price, image, inStock) VALUES (?, ?, ?, ?)', initial_products)
        
    conn.commit()
    conn.close()

@app.route('/api/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    products = conn.execute('SELECT * FROM products ORDER BY id DESC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in products])

@app.route('/api/products', methods=['POST'])
def add_product():
    name = request.form.get('name')
    price = request.form.get('price')
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        image_path = f"/uploads/{filename}"
    else:
        return jsonify({'error': 'Invalid file type'}), 400
    
    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO products (name, price, image, inStock) VALUES (?, ?, ?, ?)', 
                         (name, price, image_path, 1))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'id': new_id, 'message': 'Product added successfully'}), 201

@app.route('/api/products/<int:id>', methods=['PATCH'])
def toggle_stock(id):
    conn = get_db_connection()
    product = conn.execute('SELECT inStock FROM products WHERE id = ?', (id,)).fetchone()
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    new_status = not product['inStock']
    conn.execute('UPDATE products SET inStock = ? WHERE id = ?', (new_status, id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Stock toggled successfully', 'inStock': new_status})

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    conn = get_db_connection()
    conn.execute('DELETE FROM products WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Product deleted successfully'})

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/orders', methods=['POST'])
def place_order():
    data = request.json
    items = data.get('items')
    total = data.get('total')
    address = data.get('address')
    phone = data.get('phone')
    payment = data.get('payment')
    
    conn = get_db_connection()
    conn.execute('INSERT INTO orders (items, total, address, phone, payment) VALUES (?, ?, ?, ?, ?)',
                 (items, total, address, phone, payment))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Order placed successfully'}), 201

@app.route('/api/orders', methods=['GET'])
def get_orders():
    conn = get_db_connection()
    orders = conn.execute('SELECT * FROM orders ORDER BY timestamp DESC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in orders])

@app.route('/admin')
def admin_portal():
    return send_from_directory('.', 'admin.html')

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    init_db()
    print("MDS MART Backend running on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)

