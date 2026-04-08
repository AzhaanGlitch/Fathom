import json
import asyncio
from typing import Dict, List, Any
from utils.llm_client import llm_client
from models.evaluation import ScoreDetail
from services.llm_evaluator import llm_evaluator, LLMEvaluator

class CouncilEvaluator(LLMEvaluator):
    """
    LLM Council evaluator that categorizes topics and routes to specialist models.
    Head LLM (llama 3.3 70b) acts as manager.
    """
    
    async def categorize_session(self, topic: str) -> str:
        """
        Use Head LLM to segregate the session based on topic.
        Categories: 'programming', 'deep_research', 'general'
        """
        prompt = f"""
Given the following session topic, categorize it into EXACTLY ONE of the following three categories:
1. "programming" - For coding, software development, algorithms, computer science.
2. "deep_research" - For complex subjects demanding heavy cognitive load (calculus, physics, advanced engineering, deep research).
3. "general" - For easier or softer subjects (English, emotional intelligence, history, basic general knowledge).

Topic: "{topic}"

Return ONLY a JSON object with a single key "category" whose value is one of "programming", "deep_research", or "general". Example: {{"category": "programming"}}
"""
        try:
            result = await llm_client._call_groq(prompt, response_format='json', temperature=0.2)
            category = result.get('category', 'general').lower()
            if category not in ['programming', 'deep_research', 'general']:
                category = 'general'
            return category
        except Exception as e:
            print(f"⚠️ Council categorization failed, defaulting to general: {e}")
            return "general"

    async def evaluate_segment(self, segment_text: str, topic: str, full_context: str = "") -> Dict[str, ScoreDetail]:
        """
        Overrides the default evaluate_segment with Council processing.
        """
        category = await self.categorize_session(topic)
        print(f"🏛️  LLM Council categorized topic '{topic}' as: {category.upper()}")
        
        prompt = self._build_enhanced_evaluation_prompt(segment_text, topic, full_context)
        
        models = []
        if category == 'programming':
            models = [
                {'provider': 'openrouter', 'model': 'minimax/minimax-01'},
                {'provider': 'openrouter', 'model': 'anthropic/claude-3.5-sonnet'}
            ]
        elif category == 'deep_research':
            models = [
                {'provider': 'gemini', 'model': 'gemini-2.5-flash'},
                {'provider': 'openrouter', 'model': 'qwen/qwen-2.5-72b-instruct'}
            ]
        else: # general
            models = [
                {'provider': 'openrouter', 'model': 'openai/gpt-4o'}
            ]
            
        print(f"🏛️  Council gathering opinions from: {[m['model'] for m in models]}")
        
        # Gather responses concurrently
        tasks = []
        for m in models:
            if m['provider'] == 'openrouter':
                tasks.append(llm_client._call_openrouter(prompt, m['model'], response_format='json', temperature=0.6))
            elif m['provider'] == 'gemini':
                tasks.append(llm_client._call_gemini(prompt, response_format='json', temperature=0.6))
            elif m['provider'] == 'groq':
                tasks.append(llm_client._call_groq(prompt, response_format='json', temperature=0.6))
                
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid_opinions = []
        for i, res in enumerate(results):
            model_name = models[i]['model']
            if isinstance(res, Exception):
                print(f"❌ Council member {model_name} failed: {res}")
            else:
                valid_opinions.append({
                    "model": model_name,
                    "evaluation": res
                })
                
        if not valid_opinions:
            print("⚠️ All council members failed, falling back to mock evaluation.")
            return self._mock_evaluation()
            
        if len(valid_opinions) == 1:
            best_evaluation = valid_opinions[0]['evaluation']
        else:
            # Head LLM reviews and chooses the best response
            print("🏛️  Head LLM (Llama 3.3 70B) reviewing council opinions...")
            best_evaluation = await self._head_llm_review(segment_text, topic, valid_opinions)
            
        # Parse into ScoreDetail as required
        required_keys = [
            'clarity', 'structure', 'correctness', 'pacing', 'communication',
            'engagement', 'examples', 'questioning', 'adaptability', 'relevance'
        ]
        
        evaluated_scores = {}
        for key in required_keys:
            if key not in best_evaluation or 'score' not in best_evaluation[key] or 'reason' not in best_evaluation[key]:
                print(f"⚠️ Invalid structure for {key} in Council response, using mock.")
                return self._mock_evaluation()
            evaluated_scores[key] = ScoreDetail(**best_evaluation[key])
            
        return evaluated_scores
        
    async def _head_llm_review(self, segment_text: str, topic: str, opinions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Head LLM synthesizes multiple model JSON opinions into the final JSON output.
        """
        opinions_text = ""
        for idx, op in enumerate(opinions):
            opinions_text += f"OPINION {idx + 1} (from {op['model']}):\n{json.dumps(op['evaluation'], indent=2)}\n\n"
            
        prompt = f"""
You are the Head Evaluator of an LLM Council. You are reviewing the teaching segment below.
Topic: {topic}
Segment: "{segment_text}"

You have received the following evaluation opinions from your specialist council members:

{opinions_text}

Your task is to review these evaluations, choose the most accurate and insightful one, or construct a final consolidated evaluation that represents the best assessment.
You must return your final decision in EXACTLY this JSON format (with 10 metrics):

{{
  "clarity": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "structure": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "correctness": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "pacing": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "communication": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "engagement": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "examples": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "questioning": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "adaptability": {{"score": <1-10>, "reason": "<reason>", "evidence": []}},
  "relevance": {{"score": <1-10>, "reason": "<reason>", "evidence": []}}
}}

Provide ONLY the final JSON evaluation.
"""
        try:
            result = await llm_client._call_groq(prompt, response_format='json', temperature=0.3)
            return result
        except Exception as e:
            print(f"❌ Head LLM review failed, returning first opinion. Error: {e}")
            return opinions[0]['evaluation']

council_evaluator = CouncilEvaluator()
