let currentQuestion = 0;
let score = 0;
let timeLeft = 60;
let timer;
let isAdultMode = false;

const tickSound = new Audio('sounds/tick.mp3');
const correctSound = new Audio('sounds/correct.mp3');
const wrongSound = new Audio('sounds/wrong.mp3');

function updateModeBanner() {
    const banner = document.getElementById('mode-banner');
    if (isAdultMode) {
        banner.textContent = 'Adult Mode';
        banner.className = 'adult-mode-banner';
    } else {
        banner.textContent = 'Kid Mode';
        banner.className = 'kid-mode-banner';
    }
}

function showGameInterface() {
    document.body.classList.add('in-game');
    updateModeBanner();
}

function hideGameInterface() {
    document.body.classList.remove('in-game');
}

function generateProblem() {
    if (!isAdultMode) {
        const num1 = Math.floor(Math.random() * 10);
        const num2 = Math.floor(Math.random() * 10);
        const operation = Math.random() < 0.5 ? '+' : '-';
        
        let answer;
        let problem;
        
        if (operation === '+') {
            answer = num1 + num2;
            problem = `${num1} + ${num2}`;
        } else {
            // For subtraction, make sure the result is positive
            if (num1 >= num2) {
                answer = num1 - num2;
                problem = `${num1} - ${num2}`;
            } else {
                answer = num2 - num1;
                problem = `${num2} - ${num1}`;
            }
        }
        
        return { problem, answer };
    } else {
        // Adult mode: more complex problems with three numbers and two operations
        const num1 = Math.floor(Math.random() * 20);
        const num2 = Math.floor(Math.random() * 15);
        const num3 = Math.floor(Math.random() * 10);
        const operations = ['+', '-'];
        const op1 = operations[Math.floor(Math.random() * 2)];
        const op2 = operations[Math.floor(Math.random() * 2)];
        
        const problem = `${num1} ${op1} ${num2} ${op2} ${num3}`;
        let answer;
        
        // Calculate the answer following order of operations
        if (op1 === '+') {
            if (op2 === '+') {
                answer = num1 + num2 + num3;
            } else {
                answer = num1 + num2 - num3;
            }
        } else {
            if (op2 === '+') {
                answer = num1 - num2 + num3;
            } else {
                answer = num1 - num2 - num3;
            }
        }
        
        return { problem, answer };
    }
}

function generateChoices(answer) {
    let choices = [answer];
    const range = isAdultMode ? 40 : 20;
    
    while (choices.length < 4) {
        const choice = Math.max(0, answer + Math.floor(Math.random() * range) - Math.floor(range/2));
        if (!choices.includes(choice)) {
            choices.push(choice);
        }
    }
    
    return choices.sort(() => Math.random() - 0.5);
}

function showQuestion() {
    const { problem, answer } = generateProblem();
    const choices = generateChoices(answer);
    
    document.getElementById('problem').textContent = `${problem} = ?`;
    document.getElementById('current-question').textContent = currentQuestion + 1;
    
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    
    choices.forEach(choice => {
        const button = document.createElement('div');
        button.className = 'choice';
        button.textContent = choice;
        button.onclick = () => checkAnswer(choice, answer, button);
        choicesContainer.appendChild(button);
    });
}

function checkAnswer(selected, correct, button) {
    const choices = document.querySelectorAll('.choice');
    choices.forEach(choice => choice.style.pointerEvents = 'none');
    
    if (selected === correct) {
        button.classList.add('correct');
        score++;
        correctSound.play();
        document.body.style.backgroundColor = '#90EE90';
        fireConfetti();
    } else {
        button.classList.add('incorrect');
        wrongSound.play();
        document.body.style.backgroundColor = '#FFB6C1';
        choices.forEach(choice => {
            if (parseInt(choice.textContent) === correct) {
                choice.classList.add('correct');
            }
        });
    }
    
    setTimeout(() => {
        document.body.style.backgroundColor = '#FFD700';
        currentQuestion++;
        if (currentQuestion < 10) {
            showQuestion();
        } else {
            clearInterval(timer);
            endGame();
        }
    }, 1500);
}

function preloadSounds() {
    tickSound.load();
    correctSound.load();
    wrongSound.load();
}

function startGame() {
    currentQuestion = 0;
    score = 0;
    timeLeft = isAdultMode ? 15 : 60;
    document.getElementById('time').textContent = timeLeft;
    showGameInterface();
    
    preloadSounds();
    document.getElementById('game-start').classList.add('hidden');
    document.getElementById('game-play').classList.remove('hidden');
    document.getElementById('game-end').classList.add('hidden');
    showQuestion();
    startTimer();
}

function startTimer() {
    updateTimer();
    console.log("Playing first tick");
    tickSound.play().catch(e => console.error("Error playing tick:", e));
    
    timer = setInterval(() => {
        timeLeft--;
        updateTimer();
        
        console.log("Playing tick sound");
        tickSound.currentTime = 0;
        tickSound.play().catch(e => console.error("Error playing tick:", e));
        
        if (timeLeft > 0 && timeLeft <= 5) {
            document.getElementById('time').classList.add('time-warning');
        }
        if (timeLeft <= 0) {
            clearInterval(timer);
            endGame();
        }
    }, 1000);
}

function updateTimer() {
    document.getElementById('time').textContent = timeLeft;
}

function getRandomCelebrationImage() {
    const imageNumber = Math.floor(Math.random() * 5) + 1;
    const extension = imageNumber <= 2 ? 'gif' : 'png';
    return `images/celebration${imageNumber}.${extension}`;
}

function endGame() {
    clearInterval(timer);
    tickSound.pause();
    tickSound.currentTime = 0;
    document.getElementById('game-play').classList.add('hidden');
    document.getElementById('game-end').classList.remove('hidden');
    document.getElementById('score').textContent = score;
    hideGameInterface();
    
    // Update the celebration image
    const celebrationImg = document.getElementById('thumbs-up-gif');
    celebrationImg.src = getRandomCelebrationImage();
    
    // Add error handling for image loading
    celebrationImg.onerror = function() {
        console.error('Failed to load celebration image:', celebrationImg.src);
        // Fallback to first image if loading fails
        celebrationImg.src = 'images/celebration1.gif';
    };
    
    let encouragement = "";
    if (score === 10) {
        encouragement = isAdultMode ? "Perfect score in adult mode! You're a math wizard! 🌟" : "Perfect score! You're a math genius! 🌟";
    } else if (score >= 8) {
        encouragement = "Amazing job! You're super smart! 🎉";
    } else if (score >= 6) {
        encouragement = "Well done! Keep practicing! 👍";
    } else {
        encouragement = "Good try! Practice makes perfect! 💪";
    }
    
    document.getElementById('encouragement').textContent = encouragement;
    
    if (score >= 8) {
        confetti({
            particleCount: 200,
            spread: 160,
            origin: { y: 0.6 }
        });
    }
}

function fireConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
    });
}

document.getElementById('start-button').onclick = () => {
    isAdultMode = false;
    startGame();
};

document.getElementById('adult-mode-button').onclick = () => {
    isAdultMode = true;
    startGame();
};

document.getElementById('play-again').onclick = () => {
    isAdultMode = false;
    startGame();
};

document.getElementById('play-again-adult').onclick = () => {
    isAdultMode = true;
    startGame();
}; 