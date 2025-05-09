from typing import List
from pydantic import BaseModel, Field

class SummaryOutput(BaseModel):
    mantra: str = Field(description="A mantra designed to instill purpose and agency.")
    purpose: str = Field(description="A 100-250 word summary of the user's purpose designed to instill agency.")
    

class Obstacle(BaseModel):
    challenge: str = Field(description="The obstacle or challenge the user will face")
    solution: str = Field(description="How to overcome this obstacle")
    type: str = Field(description="Type of obstacle: 'personal' or 'external'")

class ActionItem(BaseModel):
    text: str = Field(description="The action item text")
    category: str = Field(description="The category this item belongs to, one of: health, learning, mindfulness, writing, planning, social, nutrition, rest, creativity, family, friendship, career, finance, medical, travel, hobbies, goals, reflection, gratitude, nature")

class DailyPlanTimeframe(BaseModel):
    morning: List[ActionItem] = Field(description="Morning activities and routines")
    afternoon: List[ActionItem] = Field(description="Afternoon activities and routines")
    evening: List[ActionItem] = Field(description="Evening activities and routines")

class DailyPlan(BaseModel):
    weekdays: DailyPlanTimeframe = Field(description="Daily plan for weekdays (Monday-Friday)")
    weekends: DailyPlanTimeframe = Field(description="Daily plan for weekends (Saturday-Sunday)")

class NextSteps(BaseModel):
    today: List[ActionItem] = Field(description="Immediate actions to take today")
    next_7_days: List[ActionItem] = Field(description="Actions to take in the next 7 days")
    next_30_days: List[ActionItem] = Field(description="Actions to take in the next 30 days")
    next_180_days: List[ActionItem] = Field(description="Actions to take in the next 180 days")

class FullPlanOutput(BaseModel):
    mantra: str = Field(description="A mantra designed to instill purpose and agency.")
    purpose: str = Field(description="A 250-500 word treatment of the user's purpose designed to instill agency.")
    next_steps: NextSteps = Field(description="Practical next steps and actionable guidance structured by timeframe")
    daily_plan: DailyPlan = Field(description="A structured daily plan to set the user up for success on their path, organized by weekdays/weekends and time of day.")
    obstacles: List[Obstacle] = Field(description="Likely obstacles, both personal and external, that the user will face and how to overcome them.")
