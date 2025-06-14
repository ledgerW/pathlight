"""Complete AI chains for Pathlight generation with model configuration."""

import os
from langchain_openai import ChatOpenAI
from .ai_prompts import summary_prompt, full_plan_prompt
from .ai_models import SummaryOutput, FullPlanOutput

# Initialize OpenAI model with configuration
openai_api_key = os.getenv("OPENAI_API_KEY")
model = ChatOpenAI(
    temperature=0.2,
    model="gpt-4.1",
    max_tokens=5000,
    api_key=openai_api_key
)

# Create complete chains with structured output using Pydantic models
summary_chain = summary_prompt | model.with_structured_output(SummaryOutput)
full_plan_chain = full_plan_prompt | model.with_structured_output(FullPlanOutput)
