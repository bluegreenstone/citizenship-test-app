document.addEventListener('DOMContentLoaded', () => {
    const quiz = new CitizenshipQuiz();
});

class CitizenshipQuiz {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.score = 0;
        this.selectedMode = null;
        this.selectedCategory = null;
        this.quizQuestions = [];
        this.questionsLoaded = false;

        this.initTheme();
        this.initializeEventListeners();
        this.loadData();
    }

    async loadData() {
        try {
            const [questionsRes, categoriesRes] = await Promise.all([
                fetch('/questions.json'),
                fetch('/api/categories')
            ]);
            this.questions = await questionsRes.json();
            const categories = await categoriesRes.json();
            
            this.questionsLoaded = true;
            this.populateCategories(categories);
            console.log(`Loaded ${this.questions.length} questions and ${categories.length} categories.`);
        } catch (error) {
            console.error('Failed to load initial data:', error);
            alert('Failed to load questions or categories. Please refresh the page.');
        }
    }

    populateCategories(categories) {
        const container = document.getElementById('category-buttons');
        container.innerHTML = '';
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.dataset.category = category;
            button.textContent = category;
            button.addEventListener('click', () => {
                this.selectedCategory = category;
                this.startQuiz();
            });
            container.appendChild(button);
        });
    }

    initializeEventListeners() {
        document.getElementById('mock-test-btn').addEventListener('click', () => {
            this.selectedMode = 'mock';
            this.startQuiz();
        });

        document.getElementById('category-test-btn').addEventListener('click', () => {
            this.selectedMode = 'category';
            this.showCategorySelection();
        });

        document.getElementById('back-to-mode').addEventListener('click', () => this.showModeSelection());
        document.getElementById('submit-answer').addEventListener('click', () => this.submitAnswer());
        document.getElementById('next-question').addEventListener('click', () => this.nextQuestion());
        document.getElementById('quit-quiz').addEventListener('click', () => {
            if (confirm('Are you sure you want to quit the quiz?')) {
                this.fullReset();
                this.showModeSelection();
            }
        });

        document.getElementById('take-another').addEventListener('click', () => {
            this.fullReset();
            this.showModeSelection();
        });

        document.getElementById('review-incorrect').addEventListener('click', () => this.showReview());
        document.getElementById('back-to-results').addEventListener('click', () => this.showResults());

        document.getElementById('answer-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.submitAnswer();
            }
        });

        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());
    }

    // --- THEME MANAGEMENT ---
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        const newTheme = isDarkMode ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const iconEl = document.querySelector('#theme-toggle .icon');
        const newIcon = theme === 'dark' ? 'moon' : 'sun';
        iconEl.setAttribute('data-feather', newIcon);
        feather.replace();
    }

    // --- SCREEN NAVIGATION ---
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    showModeSelection() { this.showScreen('mode-selection'); }
    showCategorySelection() { this.showScreen('category-selection'); }
    showQuizScreen() { this.showScreen('quiz-screen'); }
    showResults() { this.showScreen('results-screen'); }
    showReview() {
        this.populateReview();
        this.showScreen('review-screen');
    }

    // --- QUIZ LOGIC ---
    startQuiz() {
        if (!this.questionsLoaded) {
            alert('Questions are still loading. Please wait a moment.');
            return;
        }
        this.resetQuiz();
        this.selectQuizQuestions();
        if (this.quizQuestions.length === 0) {
            alert('No questions available for this selection.');
            return;
        }
        this.showQuizScreen();
        this.displayQuestion();
    }

    selectQuizQuestions() {
        let pool = this.selectedMode === 'mock' 
            ? this.questions 
            : this.questions.filter(q => q.category === this.selectedCategory);
        
        this.quizQuestions = this.shuffleArray(pool).slice(0, 10);
        document.getElementById('total-questions').textContent = this.quizQuestions.length;
    }

    displayQuestion() {
        if (this.currentQuestionIndex >= this.quizQuestions.length) return;
        const question = this.quizQuestions[this.currentQuestionIndex];
        
        document.getElementById('question-text').textContent = question.question;
        document.getElementById('current-question').textContent = this.currentQuestionIndex + 1;
        
        const progress = ((this.currentQuestionIndex + 1) / this.quizQuestions.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;

        document.getElementById('answer-input').value = '';
        document.getElementById('feedback').classList.add('hidden');
        document.getElementById('submit-answer').disabled = false;
        document.getElementById('submit-answer').style.display = 'block';
        document.getElementById('answer-input').focus();
    }

    async submitAnswer() {
        const userAnswer = document.getElementById('answer-input').value.trim();
        if (!userAnswer) return alert('Please enter an answer.');

        this.showLoading(true, 'Evaluating...');
        document.getElementById('submit-answer').disabled = true;
        document.getElementById('submit-answer').style.display = 'none';

        try {
            const question = this.quizQuestions[this.currentQuestionIndex];
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: question.question, 
                    userAnswer: userAnswer, 
                    acceptableAnswers: question.answer 
                })
            });

            if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
            
            const evaluation = await response.json();
            this.userAnswers.push({ ...evaluation, question, userAnswer });
            if (evaluation.isCorrect) this.score++;
            this.showFeedback(evaluation, question);

        } catch (error) {
            console.error('Evaluation error:', error);
            alert('Could not evaluate your answer. Please try again.');
            document.getElementById('submit-answer').disabled = false;
        } finally {
            this.showLoading(false);
        }
    }

    showFeedback(evaluation, question) {
        const feedbackEl = document.getElementById('feedback');
        feedbackEl.className = `feedback ${evaluation.isCorrect ? 'correct' : 'incorrect'}`;
        
        document.getElementById('feedback-title').textContent = evaluation.isCorrect ? 'Correct!' : 'Incorrect';
        document.getElementById('feedback-text').textContent = evaluation.feedback;

        const acceptableAnswersContainer = document.getElementById('acceptable-answers-container');
        const answersListEl = document.getElementById('acceptable-answers-list');
        answersListEl.innerHTML = '';
        question.answer.forEach(ans => {
            const li = document.createElement('li');
            li.textContent = ans;
            answersListEl.appendChild(li);
        });
        acceptableAnswersContainer.style.display = evaluation.isCorrect ? 'none' : 'block';

        feedbackEl.classList.remove('hidden');
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.quizQuestions.length) {
            this.displayQuestion();
        } else {
            this.finishQuiz();
        }
    }

    finishQuiz() {
        this.displayResults();
        this.showResults();
    }

    displayResults() {
        const total = this.quizQuestions.length;
        const percentage = total > 0 ? Math.round((this.score / total) * 100) : 0;

        document.getElementById('final-score-percentage').textContent = `${percentage}%`;
        document.getElementById('final-score-text').textContent = `${this.score} / ${total} Correct`;

        const categoryStats = this.userAnswers.reduce((acc, { question, isCorrect }) => {
            const cat = question.category;
            if (!acc[cat]) acc[cat] = { correct: 0, total: 0 };
            acc[cat].total++;
            if (isCorrect) acc[cat].correct++;
            return acc;
        }, {});

        const resultsEl = document.getElementById('category-results');
        resultsEl.innerHTML = '';
        Object.entries(categoryStats).forEach(([category, stats]) => {
            const perc = Math.round((stats.correct / stats.total) * 100);
            resultsEl.innerHTML += `
                <div class="category-result">
                    <div class="category-name">${category}</div>
                    <div class="category-score">${stats.correct}/${stats.total} (${perc}%)</div>
                    <div class="category-bar"><div class="category-fill" style="width: ${perc}%"></div></div>
                </div>
            `;
        });
    }

    populateReview() {
        const reviewContent = document.getElementById('review-content');
        const incorrect = this.userAnswers.filter(a => !a.isCorrect);

        if (incorrect.length === 0) {
            reviewContent.innerHTML = '<div class="no-incorrect">🎉 Well done! You answered all questions correctly!</div>';
            return;
        }

        reviewContent.innerHTML = incorrect.map(({ question, userAnswer, feedback }) => `
            <div class="review-item">
                <p class="review-question">${question.question}</p>
                <div class="review-answers">
                    <div class="user-answer"><span>Your answer:</span> <p>${userAnswer}</p></div>
                    <div class="correct-answers"><span>Acceptable answers:</span> <ul>${question.answer.map(a => `<li>${a}</li>`).join('')}</ul></div>
                </div>
                ${feedback ? `<div class="review-feedback"><strong>Feedback:</strong> ${feedback}</div>` : ''}
            </div>
        `).join('');
    }

    // --- UTILITY FUNCTIONS ---
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    showLoading(show, text = 'Evaluating...') {
        const overlay = document.getElementById('loading-overlay');
        overlay.querySelector('p').textContent = text;
        overlay.classList.toggle('hidden', !show);
    }

    resetQuiz() {
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.score = 0;
        this.quizQuestions = [];
    }

    fullReset() {
        this.resetQuiz();
        this.selectedMode = null;
        this.selectedCategory = null;
    }
}
