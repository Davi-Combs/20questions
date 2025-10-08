// --- Sound Engine ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let soundBuffers = {};

async function loadSound(name, url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        soundBuffers[name] = audioBuffer;
    } catch (error) {
        console.error(`Failed to load sound: ${name}`, error);
    }
}

function playSound(name) {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (soundBuffers[name]) {
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers[name];
        source.connect(audioContext.destination);
        source.start(0);
    }
}

// --- DOM Elements ---
const dialogueText = document.getElementById('dialogue-text');
const controlsBox = document.getElementById('controls-box');
const gameOverBox = document.getElementById('game-over-box'); // For extra buttons
const rabbitContainer = document.getElementById('rabbit-container');
const learningBox = document.getElementById('learning-box');
const userObjectInput = document.getElementById('user-object-input');
const newQuestionInput = document.getElementById('new-question-input');
const newQYesBtn = document.getElementById('new-q-yes-btn');
const newQNoBtn = document.getElementById('new-q-no-btn');

// --- Game Logic ---
let gameState = 'start';
let currentNode = null;
let parentNode = null;
let lastAnswer = null;

// Initial decision tree. Can be expanded by learning.
const initialDecisionTree = {
    question: "Is it an animal?",
    yes: {
        question: "Does it meow?",
        yes: { guess: "a cat" },
        no: { guess: "a dog" }
    },
    no: {
        question: "Can you eat it?",
        yes: { guess: "a carrot" },
        no: { guess: "a rock" }
    }
};

let decisionTree = JSON.parse(JSON.stringify(initialDecisionTree));

function typeWriter(text, onComplete) {
    let i = 0;
    dialogueText.textContent = "";
    function type() {
        if (i < text.length) {
            dialogueText.textContent += text.charAt(i);
            if (Math.random() < 0.1) playSound('glitch');
            i++;
            setTimeout(type, 50 + Math.random() * 50);
        } else {
            if (onComplete) onComplete();
        }
    }
    type();
}


function showButtons(buttons, container = controlsBox) {
    container.innerHTML = '';
    for (const [text, handler] of Object.entries(buttons)) {
        const button = document.createElement('button');
        button.textContent = text;
        button.onclick = () => {
            playSound('click');
            handler();
        };
        container.appendChild(button);
    }
}

function resetGameToInitialState() {
    decisionTree = JSON.parse(JSON.stringify(initialDecisionTree));
    beginGame();
}

function startGame() {
    gameState = 'intro';
    learningBox.classList.add('hidden');
    gameOverBox.classList.add('hidden');
    typeWriter("Do you... wanna play a game...?", () => {
        showButtons({ 'Yes': beginGame, 'No': () => typeWriter("...maybe later...") });
    });
}

function beginGame() {
    gameOverBox.classList.add('hidden');
    currentNode = decisionTree;
    parentNode = null;
    lastAnswer = null;
    askQuestion();
}

function askQuestion() {
    gameState = 'playing';
    typeWriter(currentNode.question, () => {
        showButtons({ 'Yes': () => handleAnswer('yes'), 'No': () => handleAnswer('no') });
    });
}

function handleAnswer(answer) {
    parentNode = currentNode;
    lastAnswer = answer;
    currentNode = currentNode[answer];

    if (currentNode.guess) {
        makeGuess();
    } else {
        askQuestion();
    }
}

function makeGuess() {
    gameState = 'guessing';
    typeWriter(`Is it... ${currentNode.guess}?`, () => {
        showButtons({ 'Yes, you got it!': handleCorrectGuess, 'No, you lose.': startLearning });
    });
}

function handleCorrectGuess() {
    gameState = 'end';
    typeWriter("Heh heh heh... I always win. Play again?", () => {
        showButtons({ 'Play Again': beginGame });
        gameOverBox.classList.remove('hidden');
        showButtons({ 'Start Over (Reset Memory)': resetGameToInitialState }, gameOverBox);
    });
}

function startLearning() {
    gameState = 'learning';
    controlsBox.innerHTML = '';
    gameOverBox.classList.add('hidden');
    learningBox.classList.remove('hidden');
    typeWriter("Hmph. You got me. Help me learn.");
}

function processLearning(newQuestionAnswer) {
    const userObject = userObjectInput.value.trim();
    const newQuestion = newQuestionInput.value.trim();

    if (!userObject || !newQuestion) {
        alert("Please fill out all fields to teach me!");
        return;
    }

    const oldGuessNode = currentNode;
    const newObjectNode = { guess: userObject };

    const newQuestionNode = {
        question: newQuestion,
        [newQuestionAnswer]: newObjectNode,
        [newQuestionAnswer === 'yes' ? 'no' : 'yes']: oldGuessNode
    };

    parentNode[lastAnswer] = newQuestionNode;

    // Reset UI
    userObjectInput.value = '';
    newQuestionInput.value = '';
    learningBox.classList.add('hidden');

    typeWriter("Hmph. Fine. I've 'learned'. Let's play again.", () => {
        showButtons({ 'Play Again': beginGame });
        gameOverBox.classList.remove('hidden');
        showButtons({ 'Start Over (Reset Memory)': resetGameToInitialState }, gameOverBox);
    });
}

// Event Listeners
rabbitContainer.addEventListener('click', () => {
    playSound('glitch');
    rabbitContainer.classList.add('glitch-container-once');
    setTimeout(() => rabbitContainer.classList.remove('glitch-container-once'), 500);
});

newQYesBtn.onclick = () => {
    playSound('click');
    processLearning('yes');
};
newQNoBtn.onclick = () => {
    playSound('click');
    processLearning('no');
};


// --- Initialization ---
async function main() {
    await Promise.all([
        loadSound('glitch', 'glitch.mp3'),
        loadSound('click', 'button_click.mp3')
    ]);
    startGame();
}

main();