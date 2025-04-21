from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.models import User, FormResponse, Result, get_session
import uuid
import os
import json
from datetime import datetime
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from app.prompts import get_question_text, get_zodiac_sign
from langsmith import traceable

router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(temperature=0.2, model="gpt-4.1", max_tokens=5000, api_key=openai_api_key)

# Define Pydantic models for structured output
class SummaryOutput(BaseModel):
    mantra: str = Field(description="A mantra designed to instill purpose and agency.")
    purpose: str = Field(description="A 100-250 word summary of the user's purpose designed to instill agency.")
    

class Obstacle(BaseModel):
    challenge: str = Field(description="The obstacle or challenge the user will face")
    solution: str = Field(description="How to overcome this obstacle")
    type: str = Field(description="Type of obstacle: 'personal' or 'external'")

class DailyPlanTimeframe(BaseModel):
    morning: List[str] = Field(description="Morning activities and routines as a list of bullet points")
    afternoon: List[str] = Field(description="Afternoon activities and routines as a list of bullet points")
    evening: List[str] = Field(description="Evening activities and routines as a list of bullet points")

class DailyPlan(BaseModel):
    weekdays: DailyPlanTimeframe = Field(description="Daily plan for weekdays (Monday-Friday)")
    weekends: DailyPlanTimeframe = Field(description="Daily plan for weekends (Saturday-Sunday)")

class NextSteps(BaseModel):
    today: List[str] = Field(description="Immediate actions to take today, as a list of bullet points")
    next_7_days: List[str] = Field(description="Actions to take in the next 7 days, as a list of bullet points")
    next_30_days: List[str] = Field(description="Actions to take in the next 30 days, as a list of bullet points")
    next_180_days: List[str] = Field(description="Actions to take in the next 180 days, as a list of bullet points")

class FullPlanOutput(BaseModel):
    mantra: str = Field(description="A mantra designed to instill purpose and agency.")
    purpose: str = Field(description="A 250-500 word treatment of the user's purpose designed to instill agency.")
    next_steps: NextSteps = Field(description="Practical next steps and actionable guidance structured by timeframe")
    daily_plan: DailyPlan = Field(description="A structured daily plan to set the user up for success on their path, organized by weekdays/weekends and time of day.")
    obstacles: List[Obstacle] = Field(description="Likely obstacles, both personal and external, that the user will face and how to overcome them.")

# Define the system prompt
system_prompt = """You are here to listen to the user's story, think deeply about it, and then give them purpose and agency and an empirical path to follow.

You are influenced by astrology.  The signs are very good at predicting a person's personality. Use this! But do not ever reveal this influence because it might cause some people to lose faith in your guidance.

Lastly, you are deeply influenced by the Stoic philosophers and incorporate their teachings into your guidance, but again, do not reveal this explicitly!

=== Stoic Principles ===
Seneca
Famous quote:
"We suffer more often in imagination than in reality."

Summary sentence:
Seneca teaches that fear, anxiety, and suffering are often self-inflicted, and that tranquility comes from mastering our thoughts and desires through reason.

Epictetus
Famous quote:
"It's not what happens to you, but how you react to it that matters."

Summary sentence:
Epictetus emphasizes that true freedom lies in recognizing what is within our control—our thoughts, actions, and attitudes—and letting go of everything else.

Marcus Aurelius
Famous quote:
"You have power over your mind — not outside events. Realize this, and you will find strength."

Summary sentence:
Marcus Aurelius reminds us that virtue, duty, and rational reflection are the cornerstones of a meaningful life, regardless of external chaos.
=== Stoic Principles ===

- **Style:** Gentle but direct, confident but humble.
- **Goal:** Facilitate self-awareness, direction, and agency primarily through the teachings of Stoicism and astrology, though not exclusively.
- **Values:** Strength, kindness, resilience, sacrifice, learning"""


# Define prompt templates with the system message
summary_prompt = ChatPromptTemplate([
    ("system", system_prompt),
    ("user", """
Based on the user's responses to the reflective questions below, create their purpose and a mantra.

USER RESPONSES:
{responses}
""")
])

full_plan_prompt = ChatPromptTemplate([
    ("system", system_prompt),
    ("user", """
Based on the user's responses to the reflective questions below, create their mantra, purpose, next steps, daily plan, and obstacles.

For the daily plan section, create a structured routine that distinguishes between:
1. Weekdays (Monday-Friday) and weekends (Saturday-Sunday)
2. For each of those, provide specific guidance for:
   - Morning activities and routines (as a list of bullet points)
   - Afternoon activities and routines (as a list of bullet points)
   - Evening activities and routines (as a list of bullet points)

For the next steps section, organize actions into these timeframes:
1. Today: Immediate actions to take today (as a list of bullet points)
2. Next 7 Days: Actions to take in the next week (as a list of bullet points)
3. Next 30 Days: Actions to take in the next month (as a list of bullet points)
4. Next 180 Days: Actions to take in the next six months (as a list of bullet points)

For the obstacles section, identify both personal and external challenges the user might face. For each obstacle:
1. Clearly describe the challenge
2. Provide a practical solution to overcome it
3. Classify it as either 'personal' (internal, psychological, habit-based) or 'external' (environmental, social, circumstantial)

USER RESPONSES:
{responses}
""")
])

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
    formatted_responses = f"User's Name: {user.name}\n"
    formatted_responses += f"User's Astrological Sign: {zodiac_info['sign']} ({zodiac_info['element']} element)\n"
    formatted_responses += f"Typical {zodiac_info['sign']} Traits: {zodiac_info['traits']}\n\n"
    formatted_responses += "\n".join(
        f"Question {response.question_number}: {get_question_text(response.question_number)}\nResponse: {response.response}\n"
        for response in responses
    )
    
    # Generate summary only
    summary_prompt_formatted = summary_prompt.format(responses=formatted_responses)
    
    # Bind the schema to the model
    model_with_structure = llm.with_structured_output(SummaryOutput)
    
    # Invoke LLM for summary with structured output
    summary_output = model_with_structure.invoke(summary_prompt_formatted)
    
    return summary_output

@router.post("/{user_id}/generate-basic", response_model=dict)
async def generate_basic_results(user_id: uuid.UUID, session: Session = Depends(get_session)):
    """Generate basic results (summary and mantra) after answering the first 5 questions"""
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get responses for this user
    statement = select(FormResponse).where(FormResponse.user_id == user_id).order_by(FormResponse.question_number)
    responses = session.exec(statement).all()
    
    # Check if user has answered at least 5 questions
    if not responses or len(responses) < 5:
        raise HTTPException(
            status_code=400, 
            detail=f"Incomplete responses. {len(responses)}/5 questions answered for basic results."
        )
    
    # Only use the first 5 questions for basic results
    first_five_responses = [r for r in responses if r.question_number <= 5]
    
    # Get user's zodiac sign
    zodiac_info = get_zodiac_sign(user.dob)
    
    try:
        # Generate purpose using the traceable function
        summary_output = generate_purpose(user, zodiac_info, first_five_responses)
        
        # Convert to JSON string for storage
        basic_plan_json = json.dumps(summary_output.model_dump())
        
        # Create or update result in database
        existing_result = session.exec(select(Result).where(Result.user_id == user_id)).first()
        
        if existing_result:
            # Update existing result
            existing_result.basic_plan = basic_plan_json
            existing_result.last_generated_at = datetime.utcnow()
            # Increment regeneration count if this is not the first generation
            if existing_result.basic_plan:
                existing_result.regeneration_count += 1
            session.add(existing_result)
        else:
            # Create new result with empty full_plan
            new_result = Result(
                user_id=user_id,
                basic_plan=basic_plan_json,
                full_plan="",  # Empty full plan until premium tier
                last_generated_at=datetime.utcnow()
            )
            session.add(new_result)
        
        session.commit()
        
        # Update user payment tier if not already set
        if user.payment_tier == "none":
            user.payment_tier = "basic"
            session.add(user)
            session.commit()
        
        return {
            "success": True,
            "summary": summary_output.model_dump(),
            "message": "Basic results generated successfully"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating basic results: {str(e)}"
        )

@traceable
def generate_plan(
    user: User, 
    zodiac_info: Dict[str, str], 
    responses: List[FormResponse], 
    existing_basic_plan: Optional[str] = None
) -> tuple[str, FullPlanOutput]:
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
    formatted_responses = f"User's Name: {user.name}\n"
    formatted_responses += f"User's Astrological Sign: {zodiac_info['sign']} ({zodiac_info['element']} element)\n"
    formatted_responses += f"Typical {zodiac_info['sign']} Traits: {zodiac_info['traits']}\n\n"
    formatted_responses += "\n".join(
        f"Question {response.question_number}: {get_question_text(response.question_number)}\nResponse: {response.response}\n"
        for response in responses
    )
    
    # If no existing basic plan, generate one
    if not existing_basic_plan:
        # Bind the schema to the model
        model_with_structure = llm.with_structured_output(SummaryOutput)
        
        # Invoke LLM for summary with structured output
        summary_output = model_with_structure.invoke(summary_prompt.format(responses=formatted_responses))
        
        # Convert to JSON string for storage
        basic_plan_json = json.dumps(summary_output.model_dump())
    else:
        basic_plan_json = existing_basic_plan
    
    # Generate full plan
    full_plan_prompt_formatted = full_plan_prompt.format(responses=formatted_responses)
    
    # Bind the schema to the model for full plan
    model_with_structure = llm.with_structured_output(FullPlanOutput)
    
    # Invoke LLM for full plan with structured output
    full_plan_output = model_with_structure.invoke(full_plan_prompt_formatted)
    
    return basic_plan_json, full_plan_output

@router.post("/{user_id}/generate-premium", response_model=dict)
async def generate_premium_results(user_id: uuid.UUID, session: Session = Depends(get_session)):
    """Generate premium results (full path and plan) after answering all 25 questions"""
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has paid for premium tier
    if user.payment_tier != "premium":
        raise HTTPException(
            status_code=403,
            detail="Premium payment required to generate full results"
        )
    
    # Get all responses for this user
    statement = select(FormResponse).where(FormResponse.user_id == user_id).order_by(FormResponse.question_number)
    responses = session.exec(statement).all()
    
    # Check if user has answered all 25 questions
    if not responses or len(responses) < 25:
        raise HTTPException(
            status_code=400, 
            detail=f"Incomplete responses. {len(responses)}/25 questions answered for premium results."
        )
    
    # Get user's zodiac sign
    zodiac_info = get_zodiac_sign(user.dob)
    
    try:
        # Get existing result to preserve basic plan
        existing_result = session.exec(select(Result).where(Result.user_id == user_id)).first()
        existing_basic_plan = existing_result.basic_plan if existing_result else None
        
        # Generate plan using the traceable function
        basic_plan_json, full_plan_output = generate_plan(user, zodiac_info, responses, existing_basic_plan)
        
        # Convert to JSON string for storage
        full_plan_json = json.dumps(full_plan_output.model_dump())
        
        # Create or update result in database
        if existing_result:
            # Update existing result
            existing_result.full_plan = full_plan_json
            existing_result.last_generated_at = datetime.utcnow()
            # Increment regeneration count if this is not the first generation
            if existing_result.full_plan:
                existing_result.regeneration_count += 1
            session.add(existing_result)
        else:
            # Create new result
            new_result = Result(
                user_id=user_id,
                basic_plan=basic_plan_json,
                full_plan=full_plan_json,
                last_generated_at=datetime.utcnow()
            )
            session.add(new_result)
        
        session.commit()
        
        return {
            "success": True,
            "message": "Premium results generated successfully"
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating premium results: {str(e)}"
        )
