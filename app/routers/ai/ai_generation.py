from typing import List, Dict, Optional, Tuple
import os
import json
from langchain_openai import ChatOpenAI
from langsmith import traceable
from langchain_core.runnables import RunnableLambda
from app.models import User, FormResponse
from app.prompts import get_question_text, get_zodiac_sign

from .ai_models import SummaryOutput, FullPlanOutput
from .ai_prompts import summary_prompt, full_plan_prompt

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(
    temperature=0.2, model="gpt-4.1", max_tokens=5000, api_key=openai_api_key
)

def format_responses(user: User, zodiac_info: Dict[str, str], responses: List[FormResponse]) -> str:
    """
    Format user responses for the prompt
    
    Args:
        user: User object containing name and other user data
        zodiac_info: Dictionary containing zodiac sign information
        responses: List of FormResponse objects
        
    Returns:
        Formatted string of responses
    """
    formatted_responses = f"User's Name: {user.name}\n"
    formatted_responses += f"User's Astrological Sign: {zodiac_info['sign']} ({zodiac_info['element']} element)\n"
    formatted_responses += f"Typical {zodiac_info['sign']} Traits: {zodiac_info['traits']}\n\n"
    formatted_responses += "\n".join(
        f"Question {response.question_number}: {get_question_text(response.question_number)}\nResponse: {response.response}\n"
        for response in responses
    )
    
    return formatted_responses

@traceable
def generate_purpose(user: User, zodiac_info: Dict[str, str], responses: List[FormResponse]) -> SummaryOutput:
    """
    Generate basic results (purpose and mantra) based on user responses.
    This function is traced in LangSmith for observability.
    
    Args:
        user: User object containing name and other user data
        zodiac_info: Dictionary containing zodiac sign information
        responses: List of FormResponse objects for the first 5 questions
        
    Returns:
        SummaryOutput object containing purpose and mantra
    """
    # Format responses for the prompt
    formatted_responses = format_responses(user, zodiac_info, responses)
    
    # Build the chain using the prompt and LLM
    model_with_structure = llm.with_structured_output(SummaryOutput)
    summary_chain = summary_prompt | RunnableLambda(model_with_structure.invoke)

    # Invoke LLM for summary with structured output
    summary_output = summary_chain.invoke({"responses": formatted_responses})
    
    return summary_output

@traceable
def generate_plan(
    user: User, 
    zodiac_info: Dict[str, str], 
    responses: List[FormResponse], 
    existing_basic_plan: Optional[str] = None
) -> Tuple[str, FullPlanOutput]:
    """
    Generate premium results (full plan) based on user responses.
    This function is traced in LangSmith for observability.
    
    Args:
        user: User object containing name and other user data
        zodiac_info: Dictionary containing zodiac sign information
        responses: List of FormResponse objects for all 25 questions
        existing_basic_plan: Optional existing basic plan JSON string
        
    Returns:
        Tuple of (basic_plan_json, full_plan_output) where:
            - basic_plan_json is the JSON string of the basic plan
            - full_plan_output is the FullPlanOutput object
    """
    # Format responses for the prompt
    formatted_responses = format_responses(user, zodiac_info, responses)
    
    # If no existing basic plan, generate one
    if not existing_basic_plan:
        model_with_structure = llm.with_structured_output(SummaryOutput)
        summary_chain = summary_prompt | RunnableLambda(model_with_structure.invoke)
        summary_output = summary_chain.invoke({"responses": formatted_responses})
        basic_plan_json = json.dumps(summary_output.model_dump())
    else:
        basic_plan_json = existing_basic_plan

    # Generate full plan
    model_with_structure_full = llm.with_structured_output(FullPlanOutput)
    full_plan_chain = full_plan_prompt | RunnableLambda(model_with_structure_full.invoke)

    # Invoke LLM for full plan with structured output
    full_plan_output = full_plan_chain.invoke({"responses": formatted_responses})
    
    return basic_plan_json, full_plan_output
