// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ", authDomain: "counting-pos-food-system.firebaseapp.com", databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "counting-pos-food-system", storageBucket: "counting-pos-food-system.firebasestorage.app", messagingSenderId: "663603508723", appId: "1:663603508723:web:14699d4ccf31faaee5ce86", measurementId: "G-LYPFSMCMXB"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the unique Order ID from the website URL
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');

    if (!orderId) {
        document.querySelector('.container').innerHTML = '<h1>No Order ID provided.</h1>';
        return;
    }

    // 2. Create a reference to that specific order in the database
    const orderRef = database.ref('orders/' + orderId);

    // 3. Listen for REAL-TIME changes to the order's data
    orderRef.on('value', (snapshot) => {
        const orderData = snapshot.val();
        if (orderData) {
            updateStatusPage(orderData);
        } else {
            document.querySelector('.container').innerHTML = '<h1>Order not found.</h1>';
        }
    });
});

// 4. Function to update the HTML with the latest order data
function updateStatusPage(order) {
    const statusEl = document.getElementById('order-status');
    const nameEl = document.getElementById('customer-name-display');
    const itemsEl = document.getElementById('order-items-display');
    const totalEl = document.getElementById('order-total-display');

    nameEl.textContent = order.customerName;
    totalEl.textContent = `Total: RM${order.total.toFixed(2)}`;

    // Update status text and color
    let statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
    statusEl.textContent = statusText;
    statusEl.className = 'status-' + order.status; // e.g., 'status-pending', 'status-preparing'

    // Display the items
    itemsEl.innerHTML = ''; // Clear previous items
    const itemsList = document.createElement('ul');
    for (const key in order.items) {
        const item = order.items[key];
        const li = document.createElement('li');
        li.textContent = `${item.name} x${item.quantity}`;
        itemsList.appendChild(li);
    }
    itemsEl.appendChild(itemsList);
}