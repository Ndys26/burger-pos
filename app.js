// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ", authDomain: "counting-pos-food-system.firebaseapp.com", databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "counting-pos-food-system", storageBucket: "counting-pos-food-system.firebasestorage.app", messagingSenderId: "663603508723", appId: "1:663603S508723:web:14699d4ccf31faaee5ce86", measurementId: "G-LYPFSMCMXB"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const menuContainer = document.getElementById('menu-container');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const submitOrderBtn = document.getElementById('submit-order');
let cart = {};

// --- Helper Functions for Acronyms ---
const getProductShortName = (name) => {
    if (name.includes('Ramly')) return 'Ramly';
    if (name.includes('Benjo')) return 'Benjo';
    if (name.includes('Oblong')) return 'Oblong';
    if (name.includes('Maggi')) return 'Maggi';
    return name;
};

// --- THIS IS THE CORRECTED FUNCTION ---
const getAcronymForType = (type) => {
    if (!type) return '';
    const map = {
        'Patty Ayam': 'PA', 'Patty Daging': 'PD', 'Oblong Ayam': 'OA',
        'Oblong Daging': 'OD', 'Oblong Kambing': 'OK'
    };
    // If a specific acronym exists in the map, use it.
    // Otherwise, fall back to the first letter (for 'Ayam', 'Daging').
    return map[type] || type.charAt(0).toUpperCase();
};

const getAcronymForStyle = (style) => {
    if (!style || style === 'Biasa') {
        return ''; // Correctly returns nothing for Biasa
    }
    const map = {
        'Special': 'S', 'Double': 'D', 'Double Special': 'DS',
        'Triple': 'T', 'Triple Special': 'TS', 'Biasa Special': 'BS'
    };
    return map[style] || '';
};


const getAcronymForOption = (optionName) => {
    if (optionName.includes('Cheese')) return 'C';
    if (optionName.includes('Telur')) return 'T';
    if (optionName.includes('Maggi')) return 'M';
    if (optionName.includes('Daging')) return 'D+';
    return '';
};


function displayMenu() {
    const productsRef = database.ref('products');
    productsRef.on('value', (snapshot) => {
        const productsData = snapshot.val();
        menuContainer.innerHTML = '';
        if (!productsData) {
            menuContainer.innerHTML = "<p>Menu is currently unavailable.</p>"; return;
        }
        const productsArray = Object.keys(productsData).map(key => ({ key: key, ...productsData[key] }));
        productsArray.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

        productsArray.forEach(product => {
            const productKey = product.key;
            const productCard = document.createElement('div'); productCard.classList.add('product-card'); productCard.id = productKey;
            const types = [...new Set(Object.values(product.variants).map(v => v.type))].filter(Boolean);
            const styles = [...new Set(Object.values(product.variants).map(v => v.style))].filter(Boolean);
            let typesHtml = types.length > 0 ? `<div class="choice-group"><h4>Pilih Daging:</h4>${types.map(type => `<label><input type="radio" name="${productKey}_type" value="${type}">${type}</label>`).join('')}</div>` : '';
            let stylesHtml = styles.length > 0 ? `<div class="choice-group"><h4>Pilih Jenis:</h4>${styles.map(style => `<label><input type="radio" name="${productKey}_style" value="${style}">${style}</label>`).join('')}</div>` : '';
            let optionsHtml = product.options ? `<div class="choice-group"><h4>Tambah:</h4>${product.options.map(opt => `<label><input type="checkbox" class="option-checkbox" data-price="${opt.price}" data-name="${opt.name}">${opt.name} (+RM${opt.price.toFixed(2)})</label>`).join('')}</div>` : '';
            productCard.innerHTML = `<h2>${product.name}</h2>${typesHtml}${stylesHtml}${optionsHtml}<div class="product-footer"><span class="price-display">Pilih untuk lihat harga</span><button class="add-to-cart-btn" disabled>Add</button></div>`;
            menuContainer.appendChild(productCard);
        });
    });
}

function updatePrice(cardElement) {
    const productKey = cardElement.id;
    const productsRef = database.ref('products/' + productKey);
    productsRef.once('value', (snapshot) => {
        const product = snapshot.val();
        if (!product) return;
        const selectedType = cardElement.querySelector(`input[name="${productKey}_type"]:checked`)?.value;
        const selectedStyle = cardElement.querySelector(`input[name="${productKey}_style"]:checked`)?.value;
        const addButton = cardElement.querySelector('.add-to-cart-btn');
        const priceDisplay = cardElement.querySelector('.price-display');
        const hasTypes = !!Object.values(product.variants).find(v => v.type);
        const hasStyles = !!Object.values(product.variants).find(v => v.style);
        let variantFound = null;
        let isSelectionComplete = (!hasTypes || selectedType) && (!hasStyles || selectedStyle);

        for (const key in product.variants) {
            const variant = product.variants[key];
            const typeMatch = !hasTypes || variant.type === selectedType;
            const styleMatch = !hasStyles || variant.style === selectedStyle;
            if (typeMatch && styleMatch) { variantFound = variant; break; }
        }
        
        if (variantFound && isSelectionComplete) {
            let currentPrice = variantFound.price;
            cardElement.querySelectorAll('.option-checkbox:checked').forEach(box => { currentPrice += parseFloat(box.dataset.price); });
            priceDisplay.textContent = `RM${currentPrice.toFixed(2)}`;
            addButton.disabled = false;
        } else {
            priceDisplay.textContent = 'Pilih untuk lihat harga';
            addButton.disabled = true;
        }
    });
}

menuContainer.addEventListener('change', (e) => {
    if (e.target.type === 'radio' || e.target.type === 'checkbox') {
        const card = e.target.closest('.product-card');
        if (card) updatePrice(card);
    }
});


menuContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const card = e.target.closest('.product-card');
        const productKey = card.id;
        const productName = card.querySelector('h2').textContent;
        const selectedType = card.querySelector(`input[name="${productKey}_type"]:checked`)?.value;
        const selectedStyle = card.querySelector(`input[name="${productKey}_style"]:checked`)?.value;

        database.ref('products/' + productKey).once('value', (snapshot) => {
            const productData = snapshot.val();
            let variantKey = null;
            let variantFound = null;

            for (const vKey in productData.variants) {
                const variant = productData.variants[vKey];
                const typeMatch = selectedType ? variant.type === selectedType : true;
                const styleMatch = selectedStyle ? variant.style === selectedStyle : true;
                if (typeMatch && styleMatch) {
                    variantKey = vKey;
                    variantFound = variant;
                    break;
                }
            }
            if (!variantFound) return;

            const shortName = getProductShortName(productName);
            let acronymParts = [
                getAcronymForType(variantFound.type),
                getAcronymForStyle(variantFound.style)
            ];
            
            let finalPrice = variantFound.price;
            let optionNamesForAcronym = [];

            card.querySelectorAll('.option-checkbox:checked').forEach(box => {
                finalPrice += parseFloat(box.dataset.price);
                optionNamesForAcronym.push(getAcronymForOption(box.dataset.name));
            });
            
            const finalAcronym = acronymParts.concat(optionNamesForAcronym).filter(Boolean).join('');
            
            const kitchenName = `${shortName}: ${finalAcronym}`;

            const cartKey = `${productKey}_${variantKey}_${optionNamesForAcronym.sort().join('')}`;

            if (cart[cartKey]) {
                cart[cartKey].quantity++;
            } else {
                cart[cartKey] = {
                    productKey, variantKey, name: kitchenName, price: finalPrice, quantity: 1
                };
            }
            updateCart();
            
            card.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => input.checked = false);
            updatePrice(card);
        });
    }
});


function updateCart() {
    cartItems.innerHTML = '';
    let total = 0;
    for (const key in cart) {
        const item = cart[key];
        const li = document.createElement('li');
        li.classList.add('cart-item');
        const itemText = document.createElement('span');
        itemText.textContent = `${item.name} x${item.quantity} - RM${(item.price * item.quantity).toFixed(2)}`;
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✖';
        deleteBtn.classList.add('delete-cart-item-btn');
        deleteBtn.dataset.cartKey = key;
        li.appendChild(itemText);
        li.appendChild(deleteBtn);
        cartItems.appendChild(li);
        total += item.price * item.quantity;
    }
    cartTotal.textContent = total.toFixed(2);
}

cartItems.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-cart-item-btn')) {
        const cartKeyToDelete = e.target.dataset.cartKey;
        if (cart[cartKeyToDelete]) { delete cart[cartKeyToDelete]; updateCart(); }
    }
});

submitOrderBtn.addEventListener('click', () => {
    const customerName = document.getElementById('customer-name').value;
    const customerRemarks = document.getElementById('order-remarks').value;
    
    if (Object.keys(cart).length === 0) { alert("Your cart is empty!"); return; }
    if (customerName.trim() === '') { alert("Please enter your name!"); return; }

    const newOrderRef = database.ref('orders').push();
    newOrderRef.set({
        customerName, customerRemarks, items: cart,
        total: parseFloat(cartTotal.textContent), timestamp: Date.now(), status: "pending"
    });

    for (const key in cart) {
        const item = cart[key];
        const itemRef = database.ref(`products/${item.productKey}/variants/${item.variantKey}/soldToday`);
        itemRef.transaction(currentValue => (currentValue || 0) + item.quantity);
    }
    
    alert('Order placed successfully!');
    cart = {}; document.getElementById('customer-name').value = ''; document.getElementById('order-remarks').value = ''; updateCart();
});

// Initial Load
displayMenu();