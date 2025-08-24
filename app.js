// --- Firebase Configuration ---
const firebaseConfig = { apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ", authDomain: "counting-pos-food-system.firebaseapp.com", databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "counting-pos-food-system", storageBucket: "counting-pos-food-system.firebasestorage.app", messagingSenderId: "663603508723", appId: "1:663603508723:web:14699d4ccf31faaee5ce86", measurementId: "G-LYPFSMCMXB" };
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- DOM Elements ---
const welcomeSection = document.getElementById('welcome-section');
const orderSection = document.getElementById('order-section');
const customerNameInput = document.getElementById('customer-name-input');
const startOrderBtn = document.getElementById('start-order-btn');
const displayCustomerName = document.getElementById('display-customer-name');
const menuContainer = document.getElementById('menu-container');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const submitOrderBtn = document.getElementById('submit-order');

// --- Global State ---
let cart = {};
let customerNameGlobal = '';
let ingredientsAvailability = {};

// --- Listen for Ingredient Stock ---
function listenForIngredientAvailability() {
    database.ref('ingredients').on('value', (snapshot) => {
        ingredientsAvailability = snapshot.val() || {};
        if (orderSection.style.display === 'block') {
            displayMenu();
        }
    });
}

// --- Displays a clean, collapsed menu with price ranges ---
function displayMenu() {
    database.ref('products').on('value', (snapshot) => {
        const productsData = snapshot.val();
        menuContainer.innerHTML = '';
        if (!productsData) { menuContainer.innerHTML = "<p>Menu is not available.</p>"; return; }
        
        const productsArray = Object.keys(productsData).map(key => ({ ...productsData[key], key }));
        productsArray.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

        productsArray.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card collapsed';
            card.id = product.key;
            
            const prices = Object.values(product.variants).map(v => v.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            let priceRangeText = `RM${minPrice.toFixed(2)}`;
            if (minPrice !== maxPrice) {
                priceRangeText += ` - RM${maxPrice.toFixed(2)}`;
            }

            card.innerHTML = `
                <div class="product-header">
                    <h2>${product.name}</h2>
                    <span class="price-range">${priceRangeText}</span>
                </div>
                <div class="product-body" style="display: none;">
                    <!-- Content will be built here -->
                </div>
            `;
            menuContainer.appendChild(card);
        });
    });
}

// --- Builds the full set of options when a card is expanded ---
function buildProductOptions(card, product) {
    const productKey = product.key;
    const body = card.querySelector('.product-body');
    body.innerHTML = ''; 

    let descriptionHtml = product.description ? `<p class="product-description">${product.description}</p>` : '';
    const styles = [...new Set(Object.values(product.variants).map(v => v.style))].filter(Boolean);
    const types = [...new Set(Object.values(product.variants).map(v => v.type))].filter(Boolean);
    
    let stylesHtml = styles.length ? `<div class="choice-group style-group"><h4>Pilih Jenis:</h4><div class="options-wrapper">${styles.map(style => `<label><input type="radio" name="${productKey}_style" value="${style}">${style}</label>`).join('')}</div></div>` : '';
    let typesHtml = types.length ? `<div class="choice-group type-group" style="display:none;"><h4>Pilih Daging:</h4><div class="options-wrapper">${types.map(type => `<label><input type="radio" name="${productKey}_type" value="${type}">${type}</label>`).join('')}</div></div>` : '';
    
    let customizationsHtml = `<div class="customizations-container" style="display:none;"><h4>Penyesuaian:</h4>`;
    if (product.options) {
        customizationsHtml += `<div class="options-wrapper">${product.options.map(opt => {
            const isAvailable = ingredientsAvailability[opt.key]?.isAvailable ?? true;
            return `<label class="${!isAvailable ? 'disabled-option' : ''}"><input type="checkbox" class="option-checkbox" data-price="${opt.price}" data-name="${opt.name}" ${!isAvailable ? 'disabled' : ''}>${opt.name}${opt.price > 0 ? ` (+RM${opt.price.toFixed(2)})` : ''}</label>`;
        }).join('')}</div>`;
    }
    if (product.customizations) {
        for (const category in product.customizations) {
            customizationsHtml += `<div class="sub-customization-group"><h5>${category}</h5><div class="options-wrapper">`;
            customizationsHtml += product.customizations[category].map(item => `<label><input type="checkbox" class="customization-checkbox" data-id="${item.id}" data-name="${item.name}">${item.name}</label>`).join('');
            customizationsHtml += `</div></div>`;
        }
    }
    customizationsHtml += `</div>`;
    
    const footerHtml = `<div class="product-footer-actions">
        <span class="price-display">Select options...</span>
        <button class="add-to-cart-btn" disabled>Add to Order</button>
    </div>`;

    body.innerHTML = `${descriptionHtml}${stylesHtml}${typesHtml}${customizationsHtml}${footerHtml}`;
    body.style.display = 'block';
}

// --- Updates the UI based on user selections ---
function updateProductUI(card) {
    const productKey = card.id;
    database.ref('products/' + productKey).once('value', snapshot => {
        const product = snapshot.val(); if (!product) return;

        const selectedStyle = card.querySelector(`input[name="${productKey}_style"]:checked`)?.value;
        const selectedType = card.querySelector(`input[name="${productKey}_type"]:checked`)?.value;
        
        const typeGroup = card.querySelector('.type-group');
        const customizationsContainer = card.querySelector('.customizations-container');
        const priceDisplay = card.querySelector('.price-display');
        const addButton = card.querySelector('.add-to-cart-btn');

        if (selectedStyle) {
            if (customizationsContainer) customizationsContainer.style.display = 'block';
            const needsMeat = Object.values(product.variants).some(v => v.style === selectedStyle && v.type);
            if (needsMeat) {
                if (typeGroup) typeGroup.style.display = 'block';
            } else {
                if (typeGroup) typeGroup.style.display = 'none';
                card.querySelectorAll(`input[name="${productKey}_type"]`).forEach(radio => radio.checked = false);
            }
        } else {
             if (typeGroup) typeGroup.style.display = 'none';
             if (customizationsContainer) customizationsContainer.style.display = 'none';
        }

        let variantFound = null;
        for (const vKey in product.variants) {
            const v = product.variants[vKey];
            if (v.style === selectedStyle && (!v.type || v.type === selectedType)) { variantFound = v; break; }
        }

        const isReadyToAdd = variantFound && (!variantFound.type || selectedType);
        
        if (isReadyToAdd && variantFound.isAvailable) {
            let currentPrice = variantFound.price;
            card.querySelectorAll('.option-checkbox:checked').forEach(box => currentPrice += parseFloat(box.dataset.price));
            priceDisplay.textContent = `RM ${currentPrice.toFixed(2)}`;
            addButton.disabled = false;
        } else {
            priceDisplay.textContent = 'Select options...';
            addButton.disabled = true;
        }
    });
}

// --- Event Listeners ---
menuContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.product-card');
    if (!card) return;

    if (e.target.closest('.product-header') && card.classList.contains('collapsed')) {
        card.classList.remove('collapsed');
        database.ref('products/' + card.id).once('value', snapshot => {
            buildProductOptions(card, { ...snapshot.val(), key: card.id });
        });
        return;
    }
    
    if (e.target.classList.contains('add-to-cart-btn')) {
        const productKey = card.id;
        const productName = card.querySelector('h2').textContent;
        const selectedType = card.querySelector(`input[name="${productKey}_type"]:checked`)?.value;
        const selectedStyle = card.querySelector(`input[name="${productKey}_style"]:checked`)?.value;
        
        database.ref('products/' + productKey).once('value', snapshot => {
            const productData = snapshot.val();
            let variantFound = null, variantKey = null;
            for (const vKey in productData.variants) {
                const v = productData.variants[vKey];
                if (v.style === selectedStyle && (!v.type || v.type === selectedType)) {
                    variantFound = v; variantKey = vKey; break;
                }
            }
            if (!variantFound) return;

            let finalPrice = variantFound.price;
            let customizations = [];
            card.querySelectorAll('.option-checkbox:checked, .customization-checkbox:checked').forEach(box => {
                if (box.dataset.price) finalPrice += parseFloat(box.dataset.price);
                customizations.push(box.dataset.name);
            });
            
            const displayName = [productName, selectedStyle, selectedType].filter(Boolean).join(' ');
            
            const cartKey = `${productKey}_${variantKey}_${customizations.sort().join('')}`;
            if (cart[cartKey]) { cart[cartKey].quantity++; } 
            else { cart[cartKey] = { productKey, variantKey, displayName, price: finalPrice, quantity: 1, customizations }; }
            
            updateCart();
            
            card.querySelector('.product-body').style.display = 'none';
            card.querySelector('.product-body').innerHTML = '';
            card.classList.add('collapsed');
        });
    }
});

menuContainer.addEventListener('change', e => {
    if (e.target.matches('input')) {
        const card = e.target.closest('.product-card');
        if (card) {
            const masterSayur = card.querySelector('[data-id="tnsayur"]');
            if(masterSayur) {
                 const isChecked = masterSayur.checked;
                 card.querySelectorAll('[data-id="tntimun"],[data-id="tnbawang"],[data-id="tntomato"],[data-id="tnsalad"]').forEach(childCheckbox => {
                     childCheckbox.disabled = isChecked;
                     if (isChecked) childCheckbox.checked = false;
                 });
            }
            updateProductUI(card);
        }
    }
});

function updateCart() {
    cartItems.innerHTML = '';
    let total = 0;
    for (const key in cart) {
        const item = cart[key];
        const li = document.createElement('li'); li.classList.add('cart-item');
        let customizationsHtml = item.customizations && item.customizations.length > 0 ? `<ul class="cart-item-customizations"><li>- ${item.customizations.join('</li><li>- ')}</li></ul>` : '';
        li.innerHTML = `<div class="cart-item-name">${item.displayName} - RM ${item.price.toFixed(2)}</div><div class="cart-item-controls"><button class="quantity-btn decrease-btn" data-key="${key}">-</button><span class="quantity-display">${item.quantity}</span><button class="quantity-btn increase-btn" data-key="${key}">+</button></div>${customizationsHtml}`;
        cartItems.appendChild(li);
        total += item.price * item.quantity;
    }
    cartTotal.textContent = total.toFixed(2);
}

cartItems.addEventListener('click', e => {
    const key = e.target.dataset.key;
    if (!key || !cart[key]) return;
    if (e.target.matches('.increase-btn')) cart[key].quantity++;
    if (e.target.matches('.decrease-btn')) cart[key].quantity--;
    if (cart[key].quantity <= 0) delete cart[key];
    updateCart();
});

submitOrderBtn.addEventListener('click', () => {
    if (Object.keys(cart).length === 0) { alert("Your cart is empty!"); return; }
    if (!customerNameGlobal) { alert("An error occurred. Please refresh."); return; }
    const newOrderRef = database.ref('orders').push();
    newOrderRef.set({
        customerName: customerNameGlobal,
        items: cart,
        total: parseFloat(cartTotal.textContent),
        timestamp: Date.now(),
        status: "pending"
    });
    for (const key in cart) {
        const item = cart[key];
        database.ref(`products/${item.productKey}/variants/${item.variantKey}/soldToday`).transaction(currentValue => (currentValue || 0) + item.quantity);
    }
    const orderId = newOrderRef.key;
    orderSection.innerHTML = `<div class="order-success"><h1>Thank You, ${customerNameGlobal}!</h1><p>Your order has been placed successfully.</p><div class="success-buttons"><a href="status.html?id=${orderId}" class="status-link" target="_blank">View My Order Status</a><button id="order-again-btn" class="order-again-link">Place Another Order</button></div></div>`;
    document.getElementById('order-again-btn').addEventListener('click', () => window.location.reload());
});


// --- THIS IS THE FIX: The missing Start Order button listener ---
startOrderBtn.addEventListener('click', () => {
    customerNameGlobal = customerNameInput.value.trim();
    if (customerNameGlobal === '') {
        alert('Please enter your name.');
        return;
    }
    displayCustomerName.textContent = customerNameGlobal;
    welcomeSection.style.display = 'none';
    orderSection.style.display = 'block';
    displayMenu(); 
});
// --- END OF FIX ---


// --- Initial Load ---
listenForIngredientAvailability();