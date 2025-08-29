document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration ---
    const firebaseConfig = { 
        apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ", 
        authDomain: "counting-pos-food-system.firebaseapp.com", 
        databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app", 
        projectId: "counting-pos-food-system", 
        storageBucket: "counting-pos-food-system.firebasestorage.app", 
        messagingSenderId: "663603508723", 
        appId: "1:663603508723:web:14699d4ccf31faaee5ce86", 
        measurementId: "G-LYPFSMCMXB" 
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth(); 

    // --- DOM Elements (Now using the correct IDs from your login.html) ---
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // --- Login Logic ---
    // Make sure the form actually exists on the page before adding the listener
    if (loginForm) {
        // Listening to the 'submit' event is better than a 'click' on the button
        loginForm.addEventListener('submit', (e) => {
            // Prevent the page from reloading
            e.preventDefault();

            const email = emailInput.value;
            const password = passwordInput.value;
            
            if (!email || !password) {
                alert('Please enter both email and password.');
                return;
            }

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Sign-in successful.
                    console.log('Login successful!');
                    // Redirect to the owner dashboard
                    window.location.href = 'owner_dashboard.html';
                })
                .catch((error) => {
                    // Handle errors here.
                    console.error("Login failed:", error);
                    alert('Error: Invalid email or password.');
                });
        });
    }
});