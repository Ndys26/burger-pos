// --- Firebase Configuration ---
const firebaseConfig = { apiKey: "AIzaSyBAZ7eWGKsLCAWbxLpytJ-a9xw5ehBYOOQ", authDomain: "counting-pos-food-system.firebaseapp.com", databaseURL: "https://counting-pos-food-system-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "counting-pos-food-system", storageBucket: "counting-pos-food-system.firebasestorage.app", messagingSenderId: "663603508723", appId: "1:663603508723:web:14699d4ccf31faaee5ce86", measurementId: "G-LYPFSMCMXB" };
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- DOM Elements ---
const greetingElement = document.getElementById('customer-name-greeting');
const orderIdDisplay = document.getElementById('order-id-display');
const statusElement = document.getElementById('order-status');
const itemsList = document.getElementById('order-items');
const totalElement = document.getElementById('order-total');
const ratingContainer = document.getElementById('rating-container');
const thankYouContainer = document.getElementById('thank-you-container');
const starsContainer = document.querySelector('.stars');
const submitReviewBtn = document.getElementById('submit-review-btn');

// --- New Game Screen Elements ---
const gameScreens = document.querySelectorAll('.game-screen');
const startGameBtn = document.getElementById('start-game-btn');
const restartGameBtn = document.getElementById('restart-game-btn');
const canvas = document.getElementById('game-canvas');
const scoreDisplay = document.getElementById('score-display');
const topScoreDisplay = document.getElementById('top-score-display');
const finalScoreValue = document.getElementById('final-score-value');
const leaderboardStartList = document.getElementById('leaderboard-start-list');
const leaderboardOverList = document.getElementById('leaderboard-over-list');

// --- ================================== ---
// ---       BURGER SNAKE GAME LOGIC      ---
// --- ================================== ---
const ctx = canvas.getContext('2d');
const gridSize = 20;
let snake, burger, score, direction, gameSpeed, isGameOver, gameLoop, isGameActive, topScore = 0;

function showGameScreen(screenId) {
    gameScreens.forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// ====================================================================
// ===               FIX #1: GAME INITIALIZATION FIXED              ===
// ====================================================================
function initGame() {
    showGameScreen('game-play-screen');
    // FIXED: Changed 'gameContainer' to 'game-play-screen', which actually exists.
    const gamePlayScreen = document.getElementById('game-play-screen'); 
    if (gamePlayScreen.clientWidth === 0) { 
        setTimeout(initGame, 100); 
        return; 
    }
    canvas.width = Math.floor(gamePlayScreen.clientWidth / gridSize) * gridSize;
    canvas.height = canvas.width;
    snake = [{ x: 8 * gridSize, y: 8 * gridSize }];
    direction = { x: 0, y: 0 };
    score = 0;
    gameSpeed = 150;
    isGameOver = false;
    isGameActive = false;
    scoreDisplay.textContent = `Score: 0`;
    placeBurger();
    drawGame();
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(updateGame, gameSpeed);
}
// ====================================================================

function placeBurger() { burger = { x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize, y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize }; }
function updateGame() {
    if (isGameOver || !isGameActive) return;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) { endGame(); return; }
    for (let i = 1; i < snake.length; i++) { if (head.x === snake[i].x && head.y === snake[i].y) { endGame(); return; } }
    snake.unshift(head);
    if (head.x === burger.x && head.y === burger.y) {
        score++;
        scoreDisplay.textContent = `Score: ${score}`;
        placeBurger();
        if (gameSpeed > 60) { gameSpeed -= 5; clearInterval(gameLoop); gameLoop = setInterval(updateGame, gameSpeed); }
    } else { snake.pop(); }
    drawGame();
}
function drawGame() {
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#28a745'; snake.forEach(segment => ctx.fillRect(segment.x, segment.y, gridSize, gridSize));
    ctx.fillStyle = '#dc3545'; ctx.fillRect(burger.x, burger.y, gridSize, gridSize);
}
function endGame() {
    isGameOver = true;
    clearInterval(gameLoop);
    finalScoreValue.textContent = score;
    showGameScreen('game-over-screen');
    checkIfHighScore(score);
}

window.addEventListener('keydown', e => {
    if (!isGameActive && document.getElementById('game-play-screen').classList.contains('active')) isGameActive = true;
    switch (e.key) {
        case 'ArrowUp': if (direction.y === 0) direction = { x: 0, y: -gridSize }; break;
        case 'ArrowDown': if (direction.y === 0) direction = { x: 0, y: gridSize }; break;
        case 'ArrowLeft': if (direction.x === 0) direction = { x: -gridSize, y: 0 }; break;
        case 'ArrowRight': if (direction.x === 0) direction = { x: gridSize, y: 0 }; break;
    }
});
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, { passive: true });
canvas.addEventListener('touchend', e => {
    if (!isGameActive) isGameActive = true;
    const dx = e.changedTouches[0].clientX - touchStartX; const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0 && direction.x === 0) direction = { x: gridSize, y: 0 }; else if (dx < 0 && direction.x === 0) direction = { x: -gridSize, y: 0 }; } 
    else { if (dy > 0 && direction.y === 0) direction = { x: 0, y: gridSize }; else if (dy < 0 && direction.y === 0) direction = { x: 0, y: -gridSize }; }
}, { passive: true });

startGameBtn.addEventListener('click', initGame);
restartGameBtn.addEventListener('click', initGame);

// --- LEADERBOARD LOGIC ---
function displayLeaderboard(scores, listElement, highlightScore) {
    listElement.innerHTML = '';
    if (!scores || scores.length === 0) { listElement.innerHTML = '<li>Be the first to set a high score!</li>'; return; }
    scores.sort((a, b) => b.score - a.score);
    topScore = scores.length > 0 ? scores[0].score : 0; // Update top score safely
    topScoreDisplay.textContent = `Top Score: ${topScore}`;
    
    scores.forEach((entry, index) => {
        const li = document.createElement('li');
        if (highlightScore && entry.score === highlightScore && entry.name === highlightScore.name) {
            li.className = 'player-score';
        }
        li.innerHTML = `<span class="rank">${index + 1}.</span> <span class="name">${entry.name}</span> <span class="score">${entry.score}</span>`;
        listElement.appendChild(li);
    });
}
function checkIfHighScore(playerScore) {
    if (playerScore <= 0) return;
    const leaderboardRef = database.ref('leaderboard');
    leaderboardRef.once('value', snapshot => {
        const leaderboard = snapshot.val() || [];
        const lowestScoreOnBoard = leaderboard.length < 10 ? 0 : leaderboard[leaderboard.length - 1].score;
        if (playerScore > lowestScoreOnBoard) {
            const playerName = prompt(`High Score! You scored ${playerScore}!\nEnter your name:`);
            if (playerName && playerName.trim() !== '') {
                const newEntry = { name: playerName.trim(), score: playerScore };
                submitHighScore(newEntry, leaderboardRef);
            }
        }
    });
}
function submitHighScore(newEntry, ref) {
    ref.transaction(currentLeaderboard => {
        if (currentLeaderboard === null) currentLeaderboard = [];
        currentLeaderboard.push(newEntry);
        currentLeaderboard.sort((a, b) => b.score - a.score);
        return currentLeaderboard.slice(0, 10);
    });
}

// ====================================================================
// ===              FIX #2: STAR RATING "GLOW" FIXED                ===
// ====================================================================
function initRatingSystem(orderRef) {
    starsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('star')) {
            const ratingValue = e.target.dataset.value;
            starsContainer.dataset.rating = ratingValue;
            // FIXED: Instead of changing the star character, we add/remove a CSS class.
            // This allows the CSS to control the "glow" color.
            document.querySelectorAll('.star').forEach(star => {
                star.classList.toggle('selected', star.dataset.value <= ratingValue);
            });
        }
    });
    submitReviewBtn.addEventListener('click', () => {
        const rating = parseInt(starsContainer.dataset.rating, 10);
        const comment = document.getElementById('review-comment').value.trim();
        if (rating === 0) { alert('Please select a star rating.'); return; }
        const reviewData = { rating, comment, submittedAt: Date.now() };
        orderRef.child('review').set(reviewData).then(() => {
            ratingContainer.classList.add('hidden'); thankYouContainer.classList.remove('hidden');
        }).catch(error => console.error("Error submitting review:", error));
    });
}
// ====================================================================

// --- MAIN ORDER STATUS LOGIC ---
function getOrderIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}
const orderId = getOrderIdFromUrl();
if (!orderId) { document.querySelector('.container').innerHTML = '<h1>Error</h1><p>No order ID was found.</p>'; } 
else {
    const orderRef = database.ref('orders/' + orderId);
    orderRef.on('value', (snapshot) => {
        const order = snapshot.val();
        if (!order) { document.querySelector('.container').innerHTML = '<h1>Error</h1><p>Order not found.</p>'; return; }
        orderIdDisplay.textContent = `Order #${order.orderNumber || orderId.slice(-6).toUpperCase()}`;
        greetingElement.textContent = `Hi, ${order.customerName}!`;
        const currentStatus = order.status || 'pending';
        statusElement.textContent = currentStatus; statusElement.className = `status-${currentStatus}`;
        itemsList.innerHTML = '';
        for (const key in order.items) {
            const item = order.items[key]; const li = document.createElement('li');
            li.textContent = `${item.displayName || "Item"} x${item.quantity}`;
            if (item.customizations && item.customizations.length > 0) { const customUl = document.createElement('ul'); customUl.className = 'customizations-list-status'; item.customizations.forEach(cust => { const customLi = document.createElement('li'); customLi.textContent = `- ${cust}`; customUl.appendChild(customLi); }); li.appendChild(customUl); }
            itemsList.appendChild(li);
        }
        totalElement.textContent = `Total: RM ${order.total.toFixed(2)}`;
        if (order.status === 'ready' || order.status === 'completed') {
            if (order.review) { ratingContainer.classList.add('hidden'); thankYouContainer.classList.remove('hidden'); } 
            else { thankYouContainer.classList.add('hidden'); ratingContainer.classList.remove('hidden'); }
        } else { ratingContainer.classList.add('hidden'); thankYouContainer.classList.add('hidden'); }
    });
    
    initRatingSystem(orderRef);
    const leaderboardRef = database.ref('leaderboard');
    leaderboardRef.on('value', snapshot => {
        const scores = snapshot.val() || [];
        displayLeaderboard(scores, leaderboardStartList);
        displayLeaderboard(scores, leaderboardOverList);
    });
}