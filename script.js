const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const SUPABASE_URL = 'https://vkliiyqxjuhxaafrnyrb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrbGlpeXF4anVoeGFhZnJueXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzkyODYsImV4cCI6MjA5MTcxNTI4Nn0.Jn6xSg8GryDygzB3Y_y99zd1hGJ7ekXZVeNY312GJb8';

let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    console.log('Supabase yuklanmadi');
}

let verbs = [];
let usedVerbs = new Set();
let currentVerb = null;
let currentForm = 'v2';
let score = 0;
let lives = 3;
let gameActive = true;
let userId = null;
let userName = 'O\'yinchi';
let timerInterval = null;
let timeLeft = 8;
let questionsAnswered = 0;

const gameScreen = document.getElementById('gameScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const currentVerbEl = document.getElementById('currentVerb');
const translationEl = document.getElementById('translation');
const questionTextEl = document.getElementById('questionText');
const answerInput = document.getElementById('answerInput');
const submitBtn = document.getElementById('submitBtn');
const skipBtn = document.getElementById('skipBtn');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const finalScoreEl = document.getElementById('finalScore');

function createTimerBar() {
    const gameCard = document.querySelector('.game-card');
    const existingTimer = document.getElementById('timerContainer');
    if (existingTimer) existingTimer.remove();
    
    const timerContainer = document.createElement('div');
    timerContainer.id = 'timerContainer';
    timerContainer.className = 'timer-container';
    timerContainer.innerHTML = '<div class="timer-bar"><div class="timer-progress" id="timerProgress"></div></div><div class="timer-text" id="timerText">8s</div>';
    
    const questionDiv = document.querySelector('.question');
    questionDiv.parentNode.insertBefore(timerContainer, questionDiv);
}

function startTimer() {
    stopTimer();
    timeLeft = 8;
    updateTimerDisplay();
    
    timerInterval = setInterval(function() {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            stopTimer();
            if (gameActive) {
                handleTimeout();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerText = document.getElementById('timerText');
    const timerProgress = document.getElementById('timerProgress');
    
    if (timerText) {
        timerText.textContent = timeLeft + 's';
        timerText.style.color = timeLeft <= 3 ? '#e76f51' : '#2a9d8f';
    }
    
    if (timerProgress) {
        const percentage = (timeLeft / 8) * 100;
        timerProgress.style.width = percentage + '%';
        timerProgress.style.background = timeLeft <= 3 ? 'linear-gradient(90deg, #e76f51, #f4a261)' : 'linear-gradient(90deg, #2a9d8f, #52b788)';
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function handleTimeout() {
    if (!gameActive) return;
    
    lives--;
    livesEl.textContent = lives;
    showNotification('⏰ Vaqt tugadi! -1 hayot', 'error');
    
    const correctAnswer = currentVerb[currentForm];
    showNotification('To\'g\'ri javob: ' + correctAnswer, 'error', 3000);
    
    if (lives <= 0) {
        endGame();
    } else {
        loadNewQuestion();
    }
}

async function init() {
    await loadVerbs();
    initTelegramUser();
    createTimerBar();
    loadNewQuestion();
    setupEventListeners();
}

async function loadVerbs() {
    try {
        const response = await fetch('/verbs.json');
        verbs = await response.json();
    } catch (e) {
        verbs = [
            {v1: "go", v2: "went", v3: "gone", translation: "bormoq"},
            {v1: "eat", v2: "ate", v3: "eaten", translation: "yemoq"},
            {v1: "begin", v2: "began", v3: "begun", translation: "boshlamoq"}
        ];
    }
}

function initTelegramUser() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        userId = user.id;
        userName = user.first_name || 'O\'yinchi';
        if (user.last_name) userName += ' ' + user.last_name;
    } else {
        userId = 'guest_' + Date.now();
    }
}

function getRandomVerb() {
    if (usedVerbs.size >= verbs.length) {
        usedVerbs.clear();
    }
    
    const availableVerbs = verbs.filter(function(_, index) { return !usedVerbs.has(index); });
    const randomIndex = Math.floor(Math.random() * availableVerbs.length);
    const selectedVerb = availableVerbs[randomIndex];
    const originalIndex = verbs.findIndex(function(v) { return v.v1 === selectedVerb.v1; });
    usedVerbs.add(originalIndex);
    
    return selectedVerb;
}

function loadNewQuestion() {
    if (!gameActive) return;
    
    currentVerb = getRandomVerb();
    currentForm = Math.random() < 0.5 ? 'v2' : 'v3';
    
    currentVerbEl.textContent = currentVerb.v1;
    translationEl.textContent = currentVerb.translation;
    
    const formText = currentForm === 'v2' ? 'V2 (Past Simple)' : 'V3 (Past Participle)';
    questionTextEl.textContent = formText + ' shaklini yozing:';
    
    answerInput.value = '';
    answerInput.focus();
    
    questionsAnswered++;
    startTimer();
}

function checkAnswer() {
    if (!gameActive || !currentVerb) return;
    
    stopTimer();
    
    const userAnswer = answerInput.value.trim().toLowerCase();
    const correctAnswers = currentVerb[currentForm].toLowerCase().split('/');
    
    const isCorrect = correctAnswers.some(function(ans) {
        return userAnswer === ans.trim();
    });
    
    if (isCorrect) {
        score++;
        scoreEl.textContent = score;
        
        const speedBonus = Math.floor(timeLeft / 2);
        if (speedBonus > 0) {
            score += speedBonus;
            scoreEl.textContent = score;
            showNotification('✅ To\'g\'ri! +1 ball + ' + speedBonus + ' tezlik bonusi!', 'success');
        } else {
            showNotification('✅ To\'g\'ri! +1 ball', 'success');
        }
        
        loadNewQuestion();
    } else {
        lives--;
        livesEl.textContent = lives;
        
        const correctAnswer = currentVerb[currentForm];
        showNotification('❌ Xato! To\'g\'ri javob: ' + correctAnswer, 'error');
        
        if (lives <= 0) {
            endGame();
        } else {
            loadNewQuestion();
        }
    }
}

async function endGame() {
    stopTimer();
    gameActive = false;
    finalScoreEl.textContent = score;
    
    await saveScore();
    sendResultToChannel();
    
    gameScreen.classList.remove('active');
    gameOverScreen.classList.add('active');
}

async function saveScore() {
    if (!supabase) return;
    
    try {
        await supabase.from('leaderboard').insert({
            user_id: userId.toString(),
            user_name: userName,
            score: score,
            questions_answered: questionsAnswered,
            created_at: new Date().toISOString()
        });
    } catch (e) {
        console.error('Score saqlanmadi:', e);
    }
}

async function sendResultToChannel() {
    const botToken = '8687480142:AAGG4HCSSN9QzxRDY3U1hZwp6zPtrbKEWOo';
    const channelId = '@englishcodebyshaxzod';
    
    const message = '🎉 ' + userName + ' ' + score + ' ball to\'pladi! (' + questionsAnswered + ' ta savol)\n\n🏆 Reytingni ko\'rish uchun o\'yinni oching.';
    
    try {
        await fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: channelId,
                text: message
            })
        });
    } catch (e) {
        console.error('Xabar jo\'natilmadi:', e);
    }
}

function showNotification(text, type, duration = 2000) {
    const notification = document.createElement('div');
    notification.className = 'notification ' + type;
    notification.textContent = text;
    document.body.appendChild(notification);
    
    setTimeout(function() { notification.remove(); }, duration);
}

async function loadLeaderboard(tab = 'all') {
    const listEl = document.getElementById('leaderboardList');
    listEl.innerHTML = '<div class="loading">Yuklanmoqda...</div>';
    
    if (!supabase) {
        listEl.innerHTML = '<div class="loading">Ulanish yo\'q</div>';
        return;
    }
    
    try {
        let query = supabase
            .from('leaderboard')
            .select('user_name, score, questions_answered, created_at')
            .order('score', { ascending: false })
            .limit(50);
        
        if (tab === 'today') {
            const today = new Date().toISOString().split('T')[0];
            query = query.gte('created_at', today);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        if (data.length === 0) {
            listEl.innerHTML = '<div class="loading">Hali o\'yinchi yo\'q</div>';
            return;
        }
        
        let html = '';
        data.forEach(function(item, index) {
            const rankClass = index < 3 ? ' top-' + (index + 1) : '';
            html += '<div class="leaderboard-item">' +
                '<div class="leaderboard-rank' + rankClass + '">' + (index + 1) + '</div>' +
                '<div class="leaderboard-info">' +
                    '<div class="leaderboard-name">' + (item.user_name || 'Anonim') + '</div>' +
                    '<div class="leaderboard-stats">' + (item.questions_answered || 0) + ' ta savol</div>' +
                '</div>' +
                '<div class="leaderboard-score">' + item.score + ' ball</div>' +
            '</div>';
        });
        listEl.innerHTML = html;
        
    } catch (e) {
        console.error('Leaderboard yuklanmadi:', e);
        listEl.innerHTML = '<div class="loading">Xatolik yuz berdi</div>';
    }
}

function setupEventListeners() {
    submitBtn.addEventListener('click', checkAnswer);
    
    answerInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') checkAnswer();
    });
    
    skipBtn.addEventListener('click', function() {
        if (gameActive) {
            stopTimer();
            lives--;
            livesEl.textContent = lives;
            showNotification('⏭️ O\'tkazildi. -1 hayot', 'error');
            
            const correctAnswer = currentVerb[currentForm];
            showNotification('To\'g\'ri javob: ' + correctAnswer, 'error', 3000);
            
            if (lives <= 0) {
                endGame();
            } else {
                loadNewQuestion();
            }
        }
    });
    
    document.getElementById('leaderboardBtn').addEventListener('click', function() {
        stopTimer();
        gameScreen.classList.remove('active');
        leaderboardScreen.classList.add('active');
        loadLeaderboard('all');
    });
    
    document.getElementById('backBtn').addEventListener('click', function() {
        leaderboardScreen.classList.remove('active');
        if (gameActive) {
            gameScreen.classList.add('active');
            startTimer();
        } else {
            gameOverScreen.classList.add('active');
        }
    });
    
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);
    
    document.getElementById('viewLeaderboardBtn').addEventListener('click', function() {
        gameOverScreen.classList.remove('active');
        leaderboardScreen.classList.add('active');
        loadLeaderboard('all');
    });
    
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            loadLeaderboard(btn.dataset.tab);
        });
    });
}

function resetGame() {
    stopTimer();
    score = 0;
    lives = 3;
    gameActive = true;
    usedVerbs.clear();
    questionsAnswered = 0;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    
    gameOverScreen.classList.remove('active');
    gameScreen.classList.add('active');
    
    loadNewQuestion();
}

init();