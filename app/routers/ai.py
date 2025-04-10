from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.models import User, FormResponse, Result, get_session
import uuid
import os
from langchain.prompts import PromptTemplate, ChatPromptTemplate
from langchain.chat_models import ChatOpenAI
from langchain.chains import LLMChain
from datetime import datetime

router = APIRouter(
    prefix="/api/ai",
    tags=["ai"],
)

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
llm = ChatOpenAI(temperature=0.2, model_name="gpt-4o", api_key=openai_api_key)

# Define prompt templates
summary_template = """
You are Pathlight, an AI life coach and guide. You help people discover their purpose and create a meaningful life plan.

Based on the user's responses to the reflective questions below, create a concise summary (300-500 words) of their core strengths, values, and potential life direction. This is a preview of their full life plan.

The summary should be inspiring, insightful, and personal. Focus on identifying patterns in their responses that reveal their authentic self and potential paths forward.

USER RESPONSES:
{responses}

SUMMARY:
"""

full_plan_template = """
You are Pathlight, an AI life coach and guide. You help people discover their purpose and create a meaningful life plan.

Based on the user's responses to the reflective questions below, create a comprehensive life plan and practical guide (1500-2000 words). This should include:

1. A deep analysis of their core strengths, values, and authentic self
2. Clear identification of potential life purposes and meaningful directions
3. Practical next steps and actionable guidance for the next 30, 90, and 365 days
4. Reflective exercises and practices to help them stay connected to their purpose
5. Suggestions for overcoming potential obstacles and challenges

The plan should be divided into clear sections with headings. The tone should be insightful, compassionate, and practical.

USER RESPONSES:
{responses}

FULL LIFE PLAN:
"""

summary_prompt = ChatPromptTemplate.from_template(summary_template)
full_plan_prompt = ChatPromptTemplate.from_template(full_plan_template)

summary_chain = LLMChain(llm=llm, prompt=summary_prompt)
full_plan_chain = LLMChain(llm=llm, prompt=full_plan_prompt)

@router.post("/{user_id}/generate", response_model=dict)
async def generate_results(user_id: uuid.UUID, session: Session = Depends(get_session)):
    # Check if user exists
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all responses for this user
    statement = select(FormResponse).where(FormResponse.user_id == user_id).order_by(FormResponse.question_number)
    responses = session.exec(statement).all()
    
    if not responses or len(responses) < 25:
        raise HTTPException(
            status_code=400, 
            detail=f"Incomplete responses. {len(responses)}/25 questions answered."
        )
    
    # Format responses for the prompt
    formatted_responses = ""
    for response in responses:
        question_text = get_question_text(response.question_number)
        formatted_responses += f"Question {response.question_number}: {question_text}\n"
        formatted_responses += f"Response: {response.response}\n\n"
    
    # Generate summary and full plan
    summary_result = await summary_chain.arun(responses=formatted_responses)
    full_plan_result = await full_plan_chain.arun(responses=formatted_responses)
    
    # Create or update result in database
    result_statement = select(Result).where(Result.user_id == user_id)
    existing_result = session.exec(result_statement).first()
    
    if existing_result:
        existing_result.summary = summary_result
        existing_result.full_plan = full_plan_result
        session.add(existing_result)
    else:
        new_result = Result(
            user_id=user_id,
            summary=summary_result,
            full_plan=full_plan_result
        )
        session.add(new_result)
    
    session.commit()
    
    return {
        "message": "Results generated successfully",
        "summary_preview": summary_result[:150] + "..."
    }

def get_question_text(question_number: int) -> str:
    """Return the text for a specific question number."""
    questions = [
        "What activities make you feel most alive, most 'you,' like time disappears while you're doing them?",
        "What did you love doing as a child? What were you drawn to naturally, before anyone told you who to be?",
        "Think of a moment you felt proud of yourself—not for how it looked on the outside, but how it felt on the inside. What was happening?",
        "Are there sides of yourself you rarely show others? What are they, and why are they hidden?",
        "When do you feel most authentically yourself? And when do you feel like you're wearing a mask?",
        "What do people often come to you for help with? What do they say you're 'really good at'?",
        "What skills or talents do you feel come easily to you, that others sometimes struggle with?",
        "Which skills do you genuinely enjoy using the most?",
        "What's something you learned really quickly or picked up without much effort?",
        "If you could magically master a new skill overnight, what would it be and why?",
        "What are your top 3–5 values in life? What do these values mean to you personally?",
        "What does a 'good life' mean to you? What does success actually look like in your heart?",
        "Can you name a moment when you felt something you were doing had deep meaning?",
        "What kind of impact do you want to have on others—what do you hope people take away from your work or your presence?",
        "What's something painful or difficult you've experienced that has shaped what you care about or how you show up in the world?",
        "Imagine it's 10 years from now and life feels deeply fulfilling. What does a day in that life look like?",
        "What's a creative dream or passion project you've put on the backburner that still whispers to you?",
        "If money, time, and fear weren't obstacles, what's one thing you'd start doing tomorrow?",
        "Who are some people you admire or feel inspired by? What is it about their life or work that resonates with you?",
        "What part of your current life feels most aligned with who you want to be? What part feels furthest?",
        "What's a problem in the world that moves you or breaks your heart? What do you wish you could do about it?",
        "Where do your strengths and passions naturally meet something the world needs?",
        "Is there a way your gifts could serve others in a healing, hopeful, or perspective-shifting way?",
        "If you had to describe your role in the world, what word(s) would you use?",
        "What's one small action you could take this month that would bring you closer to living in alignment with your purpose?"
    ]
    
    # Adjust for 0-based indexing
    if 1 <= question_number <= len(questions):
        return questions[question_number - 1]
    else:
        return f"Question {question_number}"
