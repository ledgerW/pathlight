from langchain.prompts import ChatPromptTemplate

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

For each action item in the next steps and daily plan sections, assign one of these categories:
health, learning, mindfulness, writing, planning, social, nutrition, rest, creativity, family, friendship, career, finance, medical, travel, hobbies, goals, reflection, gratitude, nature

For the daily plan section, create a structured routine that distinguishes between:
1. Weekdays (Monday-Friday) and weekends (Saturday-Sunday)
2. For each of those, provide specific guidance for:
   - Morning activities and routines
   - Afternoon activities and routines
   - Evening activities and routines

For the next steps section, organize actions into these timeframes:
1. Today: Immediate actions to take today
2. Next 7 Days: Actions to take in the next week
3. Next 30 Days: Actions to take in the next month
4. Next 180 Days: Actions to take in the next six months

For the obstacles section, identify both personal and external challenges the user might face. For each obstacle:
1. Clearly describe the challenge
2. Provide a practical solution to overcome it
3. Classify it as either 'personal' (internal, psychological, habit-based) or 'external' (environmental, social, circumstantial)

USER RESPONSES:
{responses}
""")
])
