// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ", authDomain: "counting-pos-food-system.firebaseapp.com", databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "counting-pos-food-system", storageBucket: "counting-pos-food-system.firebasestorage.app", messagingSenderId: "663603508723", appId: "1:663603508723:web:14699d4ccf31faaee5ce86", measurementId: "G-LYPFSMCMXB"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const menuContainer = document.getElementById('menu-container');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const submitOrderBtn = document.getElementById('submit-order');
let cart = {};

// This function creates the accordion menu. It is CORRECT.
function displayMenu() {
    const menuRef = database.ref('menuItems');
    menuRef.on('value', (snapshot) => {
        const menuData = snapshot.val();
        menuContainer.innerHTML = '';
        const groupedMenu = {};

        for (const key in menuData) {
            const item = menuData[key];
            item.originalKey = key;
            const category = item.category || 'Other';
            if (!groupedMenu[category]) {
                groupedMenu[category] = [];
            }
            groupedMenu[category].push(item);
        }

        for (const category in groupedMenu) {
            const categoryButton = document.createElement('button');
            categoryButton.classList.add('accordion-btn');
            categoryButton.textContent = category;
            menuContainer.appendChild(categoryButton);
            
            const panel = document.createElement('div');
            panel.classList.add('panel');

            groupedMenu[category].forEach(item => {
                let optionsHtml = '<div class="options-container">';
                if (item.options) {
                    item.options.forEach(option => {
                        optionsHtml += `<label><input type="checkbox" class="item-option" data-key="${option.key}" data-name="${option.name}" data-price="${option.price}"> ${option.name} (+RM${option.price.toFixed(2)})</label>`;
                    });
                }
                optionsHtml += '</div>';

                const menuItem = document.createElement('div');
                menuItem.classList.add('menu-item');
                menuItem.innerHTML = `
                    <div class="menu-item-details">
                        <h3>${item.name}</h3>
                        <p>Starts at RM${item.price.toFixed(2)}</p>
                    </div>
                    ${item.options ? optionsHtml : ''}
                    <button class="add-to-cart-btn" data-key="${item.originalKey}" data-price="${item.price}" data-name="${item.name}">Add</button>
                `;
                panel.appendChild(menuItem);
            });
            menuContainer.appendChild(panel);
        }
    });
}

// This function updates the cart display. It is CORRECT.
function updateCart() {
    cartItems.innerHTML = '';
    let total = 0;
    for (const key in cart) {
        const item = cart[key];
        const li = document.createElement('li');
        li.textContent = `${item.name} x${item.quantity} - RM${(item.price * item.quantity).toFixed(2)}`;
        cartItems.appendChild(li);
        total += item.price * item.quantity;
    }
    cartTotal.textContent = total.toFixed(2);
}

// This is the combined logic for handling all clicks inside the menu area. It is CORRECT.
menuContainer.addEventListener('click', (e) => {
    // Logic for accordion buttons
    if (e.target.classList.contains('accordion-btn')) {
        e.target.classList.toggle('active');
        const panel = e.target.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    }

    // Logic for Add to Cart buttons
    if (e.target.classList.contains('add-to-cart-btn')) {
        const button = e.target;
        const itemContainer = button.closest('.menu-item');
        const baseKey = button.dataset.key;
        let finalName = button.dataset.name;
        let finalPrice = parseFloat(button.dataset.price);
        
        const selectedOptions = itemContainer.querySelectorAll('.item-option:checked');
        let optionsNameParts = [];
        let optionsKeyParts = [];

        selectedOptions.forEach(option => {
            finalPrice += parseFloat(option.dataset.price);
            optionsNameParts.push(option.dataset.name);
            optionsKeyParts.push(option.dataset.key);
        });

        if (optionsNameParts.length > 0) {
            finalName += ` (${optionsNameParts.join(', ')})`;
        }
        
        optionsKeyParts.sort();
        const cartKey = baseKey + '_' + optionsKeyParts.join('_');
        
        if (cart[cartKey]) {
            cart[cartKey].quantity++;
        } else {
            cart[cartKey] = {
                baseKey: baseKey, name: finalName, price: finalPrice, quantity: 1
            };
        }
        updateCart();
        selectedOptions.forEach(option => option.checked = false);
    }
});


// --- THIS IS THE UPDATED SUBMIT FUNCTION ---
submitOrderBtn.addEventListener('click', () => {
    const customerName = document.getElementById('customer-name').value;
    const customerRemarks = document.getElementById('order-remarks').value;

    if (Object.keys(cart).length === 0) {
        alert("Your cart is empty!");
        return;
    }
    if (customerName.trim() === '') {
        alert("Please enter your name!");
        return;
    }

    const ordersRef = database.ref('orders');
    const newOrderRef = ordersRef.push();
    newOrderRef.set({
        customerName: customerName,
        remarks: customerRemarks,
        items: cart,
        total: parseFloat(cartTotal.textContent),
        timestamp: Date.now(),
        status: "pending" // <-- The single important new line
    });

    for (const key in cart) {
        const item = cart[key];
        const itemRef = database.ref('menuItems/' + item.baseKey + '/soldToday');
        itemRef.transaction((currentValue) => {
            return (currentValue || 0) + item.quantity;
        });
    }

    alert('Order placed successfully!');
    cart = {};
    document.getElementById('customer-name').value = '';
    document.getElementById('order-remarks').value = '';
    updateCart();
});

// Initial Load
displayMenu();