const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const progressEl = document.getElementById('progress');
const modal = document.getElementById('gameOverModal');
const finalScoreEl = document.getElementById('finalScore');
const retryBtn = document.getElementById('retryBtn');

const QUESTIONS = [
    { q: "HTML stands for?", a: ["HyperText Markup Language", "HighText Machine Learning", "HyperTool Multi Language", "Home Tool Markup"], correct: 0 },
    { q: "Which is used for styling?", a: ["HTML", "CSS", "Python", "SQL"], correct: 1 },
    { q: "Brain of the computer?", a: ["RAM", "Hard Drive", "CPU", "GPU"], correct: 2 },
    { q: "Volatile Memory?", a: ["ROM", "HDD", "SSD", "RAM"], correct: 3 },
    { q: "&lt;a&gt; tag is used for?", a: ["Links", "Audio", "Animation", "Article"], correct: 0 },
    { q: "HTTP 404 means?", a: ["Server Error", "Forbidden", "Not Found", "Bad Gateway"], correct: 2 },
    { q: "Binary digits are?", a: ["1 & 2", "0 & 1", "True & False", "Yes & No"], correct: 1 },
    { q: "Which is an Output Device?", a: ["Mouse", "Keyboard", "Monitor", "Scanner"], correct: 2 },
    { q: "1 Byte equals?", a: ["8 Bits", "4 Bits", "16 Bits", "32 Bits"], correct: 0 },
    { q: "Standard port for HTTP?", a: ["21", "80", "443", "8080"], correct: 1 }
];

let currentQuestionIndex = 0;
let score = 0;
let lives = 3;
let timer;
let timeLeft;
const TIME_LIMIT = 4000; // 4 seconds

function startGame() {
    score = 0;
    lives = 3;
    currentQuestionIndex = 0;
    scoreEl.innerText = score;
    updateLives();
    modal.classList.remove('active');
    
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

    // Infinite loop of questions by reshuffling if we run out
    if (currentQuestionIndex >= QUESTIONS.length) {
        QUESTIONS.sort(() => Math.random() - 0.5);
        currentQuestionIndex = 0;
    }

    const q = QUESTIONS[currentQuestionIndex];
    questionEl.innerHTML = q.q;
    optionsEl.innerHTML = '';

    q.a.forEach((text, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerText = text;
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
            handleWrong();
        }
    }, 50); // Update every 50ms for smooth bar
}

function checkAnswer(selected, correct) {
    clearInterval(timer);
    if (selected === correct) {
        score += 10;
        scoreEl.innerText = score;
        currentQuestionIndex++;
        loadQuestion();
    } else {
        handleWrong();
    }
}

function handleWrong() {
    lives--;
    updateLives();
    // Flash Red
    document.body.style.backgroundColor = '#500';
    setTimeout(() => {
        document.body.style.backgroundColor = '';
        currentQuestionIndex++;
        loadQuestion();
    }, 200);
}

function endGame() {
    clearInterval(timer);
    finalScoreEl.innerText = score;
    modal.classList.add('active');
}

retryBtn.addEventListener('click', startGame);

startGame();
