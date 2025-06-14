from typing import List, Dict, Optional, Tuple
import json
from langsmith import traceable
from app.models import User, FormResponse
from app.prompts import get_question_text, get_zodiac_sign

from .ai_models import SummaryOutput, FullPlanOutput
from .ai_chains import summary_chain, full_plan_chain

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
    
    # Use the pre-built chain from ai_chains module
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
    
    # If no existing basic plan, generate one using the pre-built chain
    if not existing_basic_plan:
        summary_output = summary_chain.invoke({"responses": formatted_responses})
        basic_plan_json = json.dumps(summary_output.model_dump())
    else:
        basic_plan_json = existing_basic_plan

    # Generate full plan using the pre-built chain
    full_plan_output = full_plan_chain.invoke({"responses": formatted_responses})
    
    return basic_plan_json, full_plan_output
