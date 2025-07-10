import os
import json
import random
import re
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import openai
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Pydantic model for structured output
class EvaluationResponse(BaseModel):
    isCorrect: bool
    feedback: str

app = Flask(__name__)
CORS(app)

# Configure OpenAI
openai_client = None
openai_api_key = os.getenv('OPENAI_API_KEY')
print(f"API key found: {bool(openai_api_key)}")
if openai_api_key:
    try:
        # Try creating client without any extra parameters
        openai_client = openai.OpenAI(
            api_key=openai_api_key
        )
        print("OpenAI client initialized successfully")
        print(f"Has responses: {hasattr(openai_client, 'responses')}")
        
        # Test if responses API is available
        if hasattr(openai_client, 'responses'):
            print("Responses API is available")
        else:
            print("Responses API not found, checking available methods...")
            methods = [attr for attr in dir(openai_client) if not attr.startswith('_')]
            print(f"Available methods: {methods}")
            
    except Exception as e:
        print(f"Warning: OpenAI not configured properly: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
else:
    print("No OpenAI API key found in environment")

class CitizenshipQuiz:
    def __init__(self):
        self.questions = self.load_questions()
        self.setup_openai_client()
    
    def setup_openai_client(self):
        """Setup OpenAI client for this instance"""
        self.openai_client = None
        openai_api_key = os.getenv('OPENAI_API_KEY')
        print(f"Setting up OpenAI client - API key found: {bool(openai_api_key)}")
        print(f"API key length: {len(openai_api_key) if openai_api_key else 0}")
        print(f"API key starts with: {openai_api_key[:10] if openai_api_key else 'None'}...")
        
        if openai_api_key:
            try:
                # Try creating client with custom http_client to avoid proxies issue
                import httpx
                http_client = httpx.Client()
                self.openai_client = openai.OpenAI(
                    api_key=openai_api_key,
                    http_client=http_client
                )
                print("Instance OpenAI client initialized successfully")
                print(f"Has responses: {hasattr(self.openai_client, 'responses')}")
                print(f"Client type: {type(self.openai_client)}")
            except Exception as e:
                print(f"Warning: Instance OpenAI client failed: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("No OpenAI API key found for instance")
            print("Available env vars:", [k for k in os.environ.keys() if 'OPENAI' in k])
    
    def load_questions(self):
        """Load questions from JSON file"""
        try:
            with open('questions.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print("Warning: questions.json not found")
            return []
    
    def get_random_questions(self, count=10, category=None):
        """Get random questions, optionally filtered by category"""
        available_questions = self.questions
        
        if category:
            available_questions = [q for q in self.questions if q['category'] == category]
        
        if len(available_questions) < count:
            count = len(available_questions)
        
        return random.sample(available_questions, count)
    
    def get_categories(self):
        """Get unique categories from questions"""
        categories = list(set(q['category'] for q in self.questions))
        return sorted(categories)
    
    def evaluate_answer(self, question_data, user_answer):
        """Evaluate user answer against acceptable answers"""
        print(f"evaluate_answer called - self.openai_client exists: {self.openai_client is not None}")
        if self.openai_client:
            print("Using OpenAI evaluation")
            return self._evaluate_with_openai(question_data, user_answer)
        else:
            print("Using simple text matching fallback")
            return self._evaluate_simple_matching(question_data, user_answer)
    
    def _evaluate_with_openai(self, question_data, user_answer):
        """Use OpenAI to evaluate the answer using structured outputs"""
        try:
            input_messages = [
                {
                    "role": "system", 
                    "content": "You are an expert evaluator for U.S. citizenship test answers. Evaluate answers based on correctness while being flexible with minor spelling errors, grammatical mistakes, and reasonable variations in wording."
                },
                {
                    "role": "user",
                    "content": f"""Evaluate this U.S. citizenship test answer:

Question: "{question_data['question']}"
User's answer: "{user_answer}"
Acceptable answers: {', '.join([f'"{ans}"' for ans in question_data['answer']])}

Instructions:
1. Determine if the user's answer is correct based on the acceptable answers, ignoring case-sensitivity and minor spelling errors
2. Be flexible and allow for reasonable variations in wording, spelling, and phrasing
3. Accept synonyms and equivalent expressions
4. For numerical answers, accept both written and digit forms (e.g., "four" and "4")
5. Ignore minor grammatical errors and typos. If the core concept is correct then mark the answer as correct
6. The answer should demonstrate understanding of the core concept
7. DO NOT PENALIZE FOR MINOR SPELLING ERRORS OR GRAMMATICAL ERRORS
"""
                }
            ]

            print("Calling OpenAI responses.parse API...")
            response = self.openai_client.responses.parse(
                model="gpt-4o-mini",
                input=input_messages,
                text_format=EvaluationResponse
            )
            
            result = response.output_parsed
            print(f"OpenAI structured response: {result}")
            
            # Convert Pydantic model to dict for JSON serialization
            return {
                "isCorrect": result.isCorrect,
                "feedback": result.feedback
            }

        except Exception as e:
            print(f"OpenAI API error: {e}")
            return self._evaluate_simple_matching(question_data, user_answer)
    
    def _evaluate_simple_matching(self, question_data, user_answer):
        """Simple text matching fallback"""
        user_answer_clean = user_answer.lower().strip()
        
        for acceptable_answer in question_data['answer']:
            acceptable_clean = acceptable_answer.lower().strip()
            
            # Direct match
            if user_answer_clean == acceptable_clean:
                return {
                    "isCorrect": True,
                    "feedback": "Correct! Your answer matches one of the acceptable responses."
                }
            
            # Contains match
            if acceptable_clean in user_answer_clean or user_answer_clean in acceptable_clean:
                return {
                    "isCorrect": True,
                    "feedback": "Correct! Your answer matches one of the acceptable responses."
                }
        
        return {
            "isCorrect": False,
            "feedback": "Incorrect. Please review the acceptable answers."
        }

# Initialize quiz
quiz = CitizenshipQuiz()

@app.route('/')
def index():
    """Main application page"""
    return render_template('index.html')

@app.route('/api/questions')
def get_questions():
    """Get all questions or filtered by category"""
    category = request.args.get('category')
    count = int(request.args.get('count', 10))
    
    questions = quiz.get_random_questions(count=count, category=category)
    return jsonify(questions)

@app.route('/api/categories')
def get_categories():
    """Get all available categories"""
    categories = quiz.get_categories()
    return jsonify(categories)

@app.route('/api/evaluate', methods=['POST'])
def evaluate_answer():
    """Evaluate user answer"""
    try:
        data = request.get_json()
        
        if not data or 'question' not in data or 'userAnswer' not in data or 'acceptableAnswers' not in data:
            return jsonify({
                'error': 'Missing required fields: question, userAnswer, acceptableAnswers'
            }), 400
        
        question_data = {
            'question': data['question'],
            'answer': data['acceptableAnswers']
        }
        
        result = quiz.evaluate_answer(question_data, data['userAnswer'])
        return jsonify(result)
        
    except Exception as e:
        print(f"Error evaluating answer: {e}")
        return jsonify({
            'error': 'Failed to evaluate answer',
            'details': str(e)
        }), 500

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'openai_configured': openai_client is not None,
        'questions_loaded': len(quiz.questions),
        'categories': len(quiz.get_categories())
    })

@app.route('/questions.json')
def serve_questions():
    """Serve questions JSON file"""
    return send_from_directory('.', 'questions.json')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8008))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    print(f"Starting server on port {port}")
    print(f"OpenAI configured: {openai_client is not None}")
    print(f"Questions loaded: {len(quiz.questions)}")
    print(f"Categories available: {quiz.get_categories()}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
