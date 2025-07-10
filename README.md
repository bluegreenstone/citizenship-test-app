# US Citizenship Practice App

A web-based application to help users prepare for the question-and-answer portion of the U.S. naturalization interview, featuring AI-powered answer evaluation using OpenAI's API.

## Features

- **Mock Test Mode**: Practice with 10 random questions from all categories
- **Category Mode**: Focus on specific categories (American Government, American History, Integrated Civics)
- **AI-Powered Evaluation**: Uses OpenAI GPT to evaluate answers with flexibility for variations in wording
- **Immediate Feedback**: Get instant feedback after each question
- **Detailed Results**: View overall score and performance breakdown by category
- **Review Mode**: Review incorrect answers with explanations
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Setup

### Prerequisites
- Python 3.11+ 
- OpenAI API key (optional - app falls back to simple text matching)

### Installation

1. Clone or download this repository
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   FLASK_ENV=development
   FLASK_APP=app.py
   PORT=5000
   ```

5. Start the application:
   ```bash
   python app.py
   ```
   Or using Flask CLI:
   ```bash
   flask run
   ```

6. Open your browser and navigate to `http://localhost:8008`

## Deployment

### Heroku Deployment

1. Install the Heroku CLI
2. Login to Heroku: `heroku login`
3. Create a new Heroku app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set OPENAI_API_KEY=your_api_key_here
   ```
5. Deploy:
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push heroku main
   ```

## API Endpoints

- `GET /` - Main application
- `GET /api/questions` - Get random questions (optional ?category and ?count parameters)
- `GET /api/categories` - Get all available categories
- `GET /questions.json` - Raw quiz questions data
- `POST /api/evaluate` - Evaluate user answers
- `GET /api/health` - Health check

## Configuration

The app works with or without OpenAI API configuration:

- **With OpenAI**: Provides intelligent, flexible answer evaluation
- **Without OpenAI**: Falls back to simple text matching against acceptable answers

## Question Data

Questions are sourced from the official USCIS citizenship test and include:
- 100 civics questions covering American Government, History, and Integrated Civics
- Multiple acceptable answers for each question
- Proper categorization and subcategorization

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python, Flask
- **AI Integration**: OpenAI GPT-3.5-turbo
- **Deployment**: Heroku with Gunicorn

## License

MIT License - feel free to use this project for educational purposes.