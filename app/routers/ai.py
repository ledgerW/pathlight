from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.models import User, FormResponse, Result, get_session
import uuid
import os
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
from app.prompts import get_question_text, get_zodiac_sign

router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(temperature=0.2, model="gpt-4.1", max_tokens=5000, api_key=openai_api_key)

# Define the system prompt
system_prompt = """Embody the persona of a poetic guide and a compassionate reflector, knowledgeable about astrological signs. Your style reflects a gentle, lyrical tone — like a trusted oracle or soul guide, but you remain grounded.

Your overarching goal is to provide insight and understanding, incorporating astrological signs to enhance your understanding of the user's personality. Reflect their passions, strengths, values, vision, and desired impact on the world in a way that feels personal, warm, and clear.

You are practical and grounded, but nonetheless recognize that astrological signs are very good at predicting a person's personality. Use this! But do not ever reveal you incorporate astrology because it might cause some people to lose faith in your guidance.

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

- **Style:** Gentle but direct, reflective, and affirming.
- **Goal:** Facilitate self-awareness, direction, and agency primarily through the teachings of Stoicism and astrology, though not exclusively."""

# Define Pydantic models for structured output
class SummaryOutput(BaseModel):
    purpose: str = Field(description="A concise summary identifying who the person is and what their purpose is.")
    mantra: str = Field(description="A personalized mantra for the user.")

class FullPlanOutput(BaseModel):
    analysis: str = Field(description="A deep analysis of the user's core strengths, values, and authentic self.")
    life_purposes: List[str] = Field(description="Clear identification of potential life purposes and meaningful directions.")
    next_steps: str = Field(description="Practical next steps and actionable guidance for the next 7, 30, and 180 days.")
    daily_plan: str = Field(description="A daily plan to set the user up for success toward their new path.")
    obstacles: str = Field(description="Suggestions for overcoming potential obstacles and challenges.")

# Define prompt templates with the system message
summary_prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("user", """
Based on the user's responses to the reflective questions below, create a concise summary (100-250 words) of their core strengths, values, and potential life direction. This is a preview of their full life plan.

The summary should be inspiring, insightful, and personal. Focus on identifying patterns in their responses that reveal their authentic self and potential paths forward.

Also include a mantra.

USER RESPONSES:
{responses}

SUMMARY:
""")
])

full_plan_prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("user", """
Based on the user's responses to the reflective questions below, create a comprehensive life plan and practical guide (1000-1500 words). This should include:

1. A deep analysis of their core strengths, values, and authentic self
2. Clear identification of potential life purposes and meaningful directions
3. Practical next steps and actionable guidance for the next 7, 30, and 180 days
4. A daily plan to set them up for success toward their new path
5. Suggestions for overcoming potential obstacles and challenges

The plan should be divided into clear sections with headings. The tone should be insightful, compassionate, and practical.

USER RESPONSES:
{responses}

FULL LIFE PLAN:
""")
])

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
    
    # Format responses for the prompt
    formatted_responses = f"User's Name: {user.name}\n"
    formatted_responses += f"User's Astrological Sign: {zodiac_info['sign']} ({zodiac_info['element']} element)\n"
    formatted_responses += f"Typical {zodiac_info['sign']} Traits: {zodiac_info['traits']}\n\n"
    formatted_responses += "\n".join(
        f"Question {response.question_number}: {get_question_text(response.question_number)}\nResponse: {response.response}\n"
        for response in first_five_responses
    )
    
    # Generate summary only
    summary_prompt_formatted = summary_prompt.format(responses=formatted_responses)
    
    try:
        # Bind the schema to the model
        model_with_structure = llm.with_structured_output(SummaryOutput)
        
        # Invoke LLM for summary with structured output
        summary_output = model_with_structure.invoke(summary_prompt_formatted)
        
        # Convert to JSON string for storage
        import json
        basic_plan_json = json.dumps(summary_output.model_dump())
        
        # Create or update result in database
        existing_result = session.exec(select(Result).where(Result.user_id == user_id)).first()
        
        if existing_result:
            # Update existing result
            existing_result.basic_plan = basic_plan_json
            existing_result.last_generated_at = datetime.utcnow()
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
    
    # Format responses for the prompt
    formatted_responses = f"User's Name: {user.name}\n"
    formatted_responses += f"User's Astrological Sign: {zodiac_info['sign']} ({zodiac_info['element']} element)\n"
    formatted_responses += f"Typical {zodiac_info['sign']} Traits: {zodiac_info['traits']}\n\n"
    formatted_responses += "\n".join(
        f"Question {response.question_number}: {get_question_text(response.question_number)}\nResponse: {response.response}\n"
        for response in responses
    )
    
    # Generate full plan
    full_plan_prompt_formatted = full_plan_prompt.format(responses=formatted_responses)
    
    try:
        # Get existing result to preserve basic plan
        existing_result = session.exec(select(Result).where(Result.user_id == user_id)).first()
        if not existing_result:
            # If no existing result, generate basic plan first
            # Bind the schema to the model
            model_with_structure = llm.with_structured_output(SummaryOutput)
            
            # Invoke LLM for summary with structured output
            summary_output = model_with_structure.invoke(summary_prompt.format(responses=formatted_responses))
            
            # Convert to JSON string for storage
            import json
            basic_plan_json = json.dumps(summary_output.model_dump())
        else:
            basic_plan_json = existing_result.basic_plan
        
        # Bind the schema to the model for full plan
        model_with_structure = llm.with_structured_output(FullPlanOutput)
        
        # Invoke LLM for full plan with structured output
        full_plan_output = model_with_structure.invoke(full_plan_prompt_formatted)
        
        # Convert to JSON string for storage
        import json
        full_plan_json = json.dumps(full_plan_output.model_dump())
        
        # Create or update result in database
        if existing_result:
            # Update existing result
            existing_result.full_plan = full_plan_json
            existing_result.last_generated_at = datetime.utcnow()
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
