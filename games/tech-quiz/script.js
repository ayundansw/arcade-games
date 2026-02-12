const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const progressEl = document.getElementById('progress');
const modal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const retryBtn = document.getElementById('retryBtn');
const feedbackPopup = document.getElementById('feedback-popup');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackText = document.getElementById('feedback-text');

// Mixed Questions: Tech, Logic, Concentration
const QUESTIONS = [
    // --- TECH (General) ---
    { q: "Apa kepanjangan dari CPU?", a: ["Central Processing Unit", "Computer Personal Unit", "Central Power User", "Control Panel Unit"], correct: 0 },
    { q: "Otak dari sebuah komputer adalah?", a: ["Monitor", "RAM", "CPU", "Hardisk"], correct: 2 },
    { q: "Bahasa pemrograman untuk membuat struktur web?", a: ["Python", "CSS", "HTML", "Java"], correct: 2 },
    { q: "Mana yang merupakan perangkat OUTPUT?", a: ["Mouse", "Keyboard", "Speaker", "Scanner"], correct: 2 },
    { q: "RAM bersifat volatile, artinya?", a: ["Data hilang saat mati", "Data tersimpan permanen", "Hanya bisa dibaca", "Sangat lambat"], correct: 0 },

    // --- LOGIC / IQ ---
    { q: "Lanjutkan pola ini: 2, 4, 8, 16, ...?", a: ["20", "24", "32", "30"], correct: 2 },
    { q: "Jika 'AYAM' = 4, 'KUDA' = 4, maka 'KUCING' = ?", a: ["4", "5", "6", "8"], correct: 2 },
    { q: "Mana yang paling berbeda?", a: ["Mobil", "Motor", "Sepeda", "Pesawat"], correct: 3 }, // Pesawat flies, others ground
    { q: "Budi punya 3 apel, dimakan 1, sisa berapa?", a: ["2", "3 (Di perut)", "1", "0"], correct: 0 },

    // --- CONCENTRATION (Stroop Effect & Tricky) ---
    { q: "Pilih tombol yang bertuliskan warna <b>MERAH</b>!", a: ["HIJAU", "KUNING", "MERAH", "BIRU"], correct: 2 },
    // Logic: User must find text "MERAH", regardless of button color (handled in render)

    { q: "Jika Kiri adalah Kanan, dan Kanan adalah Kiri. Maka belok Kiri artinya?", a: ["Belok Kanan", "Belok Kiri", "Lurus", "Mundur"], correct: 0 },

    { q: "Jangan terkecoh! 1 jam + 60 menit = ... jam?", a: ["1", "2", "3", "120"], correct: 1 },

    { q: "Pilih jawaban yang **SALAH**!", a: ["Bumi itu bulat", "Api itu panas", "Es itu cair", "Air itu basah"], correct: 2 },

    { q: "Fokus! Warna bendera Indonesia?", a: ["Merah Biru", "Merah Putih", "Putih Merah", "Garuda"], correct: 1 }
];

let currentQuestionIndex = 0;
let score = 0;
let lives = 3;
let timer;
let timeLeft;
const TIME_LIMIT = 5000; // 5 seconds (slightly longer for reading)

const countdownOverlay = document.getElementById('countdown-overlay');
const countdownNumber = document.getElementById('countdown-number');
let isGameActive = false;

function startSystemBoot() {
    let count = 5;
    countdownOverlay.style.display = 'flex';
    countdownNumber.innerText = count;

    // Stop any existing timer just in case
    clearInterval(timer);

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.innerText = count;
        } else if (count === 0) {
            countdownNumber.innerHTML = `<span style="color:#00FF00; text-shadow: 0 0 30px #00FF00;">GO!</span>`;
        } else {
            clearInterval(interval);
            countdownOverlay.style.display = 'none';
            isGameActive = true;
            startGameLogic();
        }
    }, 1000);
}

function startGame() {
    // Reset state but wait for boot
    isGameActive = false;
    modal.classList.remove('active');
    startSystemBoot();
}

function startGameLogic() {
    score = 0;
    lives = 3;
    currentQuestionIndex = 0;
    scoreEl.innerText = score;
    updateLives();

    // Shuffle Questions
    QUESTIONS.sort(() => Math.random() - 0.5);

    loadQuestion();
}

function updateLives() {
    livesEl.innerText = "❤️".repeat(lives);
}

function loadQuestion() {
    if (lives <= 0) {
        endGame();
        return;
    }

    // Infinite loop
    if (currentQuestionIndex >= QUESTIONS.length) {
        QUESTIONS.sort(() => Math.random() - 0.5);
        currentQuestionIndex = 0;
    }

    const q = QUESTIONS[currentQuestionIndex];
    questionEl.innerHTML = q.q;
    optionsEl.innerHTML = '';

    // Clear previous specific styles
    optionsEl.className = 'options-grid';

    q.a.forEach((text, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerHTML = text; // Allow HTML for colors

        // STROOP EFFECT TRAP (Color Trick)
        if (q.q.includes("Warna")) {
            // Assign random misleading colors to buttons
            const colors = ['#FF4444', '#44FF44', '#4444FF', '#FFFF44'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            btn.style.color = randomColor;
            btn.style.borderColor = randomColor;
        }

        btn.addEventListener('click', () => checkAnswer(index, q.correct));
        optionsEl.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timeLeft = TIME_LIMIT;
    progressEl.style.width = '100%';

    let startTime = Date.now();

    timer = setInterval(() => {
        let elapsed = Date.now() - startTime;
        timeLeft = TIME_LIMIT - elapsed;

        let percentage = (timeLeft / TIME_LIMIT) * 100;
        progressEl.style.width = percentage + '%';

        if (timeLeft <= 0) {
            clearInterval(timer);
            showFeedback(false);
            setTimeout(handleWrong, 1000); // Delay for feedback
        }
    }, 50);
}

function checkAnswer(selected, correct) {
    clearInterval(timer);
    if (selected === correct) {
        showFeedback(true);
        score += 10;
        scoreEl.innerText = score;
        currentQuestionIndex++;
        setTimeout(loadQuestion, 800); // Short delay to see feedback
    } else {
        showFeedback(false);
        setTimeout(handleWrong, 1000);
    }
}

function showFeedback(isCorrect) {
    feedbackPopup.classList.remove('correct', 'wrong');
    void feedbackPopup.offsetWidth; // Trigger reflow

    if (isCorrect) {
        feedbackPopup.classList.add('correct');
        feedbackIcon.innerText = "✅";
        feedbackText.innerText = "BENAR!";
        feedbackPopup.style.color = "#00FF00";
        feedbackPopup.style.borderColor = "#00FF00";
    } else {
        feedbackPopup.classList.add('wrong');
        feedbackIcon.innerText = "❌";
        feedbackText.innerText = "SALAH!";
        feedbackPopup.style.color = "#FF0000";
        feedbackPopup.style.borderColor = "#FF0000";
    }

    feedbackPopup.classList.add('active');
    setTimeout(() => {
        feedbackPopup.classList.remove('active');
    }, 800);
}

function handleWrong() {
    lives--;
    updateLives();
    if (lives > 0) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        endGame();
    }
}

function endGame() {
    clearInterval(timer);
    finalScoreEl.innerText = score;
    modal.classList.add('active');
}

retryBtn.addEventListener('click', startGame);

// Start with Boot
// startSystemBoot(); // Already added in previous edit, just ensuring strict structure or removing duplicate if exists.
// Logic: The previous edit replaced `startGame` definition and added `startSystemBoot()` call. 
// However, I need to make sure I didn't verify the file and accidentally duplicate.
// Wait, I saw line 185 is `startGame();` in the viewed file.
// My previous edit replaced `function startGame...` block.
// I need to replace the `startGame()` call at the bottom.
startSystemBoot();
