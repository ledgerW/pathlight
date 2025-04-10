# Astrological signs and their dates
ZODIAC_SIGNS = [
    {"sign": "Aries", "start_date": (3, 21), "end_date": (4, 19), "element": "Fire", "traits": "energetic, confident, impulsive, competitive"},
    {"sign": "Taurus", "start_date": (4, 20), "end_date": (5, 20), "element": "Earth", "traits": "reliable, patient, practical, devoted, stubborn"},
    {"sign": "Gemini", "start_date": (5, 21), "end_date": (6, 20), "element": "Air", "traits": "adaptable, outgoing, curious, inconsistent"},
    {"sign": "Cancer", "start_date": (6, 21), "end_date": (7, 22), "element": "Water", "traits": "intuitive, emotional, protective, moody"},
    {"sign": "Leo", "start_date": (7, 23), "end_date": (8, 22), "element": "Fire", "traits": "creative, passionate, generous, dramatic"},
    {"sign": "Virgo", "start_date": (8, 23), "end_date": (9, 22), "element": "Earth", "traits": "analytical, practical, diligent, critical"},
    {"sign": "Libra", "start_date": (9, 23), "end_date": (10, 22), "element": "Air", "traits": "diplomatic, fair-minded, social, indecisive"},
    {"sign": "Scorpio", "start_date": (10, 23), "end_date": (11, 21), "element": "Water", "traits": "resourceful, passionate, stubborn, secretive"},
    {"sign": "Sagittarius", "start_date": (11, 22), "end_date": (12, 21), "element": "Fire", "traits": "optimistic, adventurous, independent, restless"},
    {"sign": "Capricorn", "start_date": (12, 22), "end_date": (1, 19), "element": "Earth", "traits": "disciplined, responsible, self-controlled, reserved"},
    {"sign": "Aquarius", "start_date": (1, 20), "end_date": (2, 18), "element": "Air", "traits": "progressive, original, independent, humanitarian"},
    {"sign": "Pisces", "start_date": (2, 19), "end_date": (3, 20), "element": "Water", "traits": "compassionate, artistic, intuitive, gentle"}
]

def get_zodiac_sign(dob):
    """
    Get the zodiac sign based on date of birth.
    
    Args:
        dob: A datetime object representing the date of birth
        
    Returns:
        A dictionary containing the zodiac sign information
    """
    month, day = dob.month, dob.day
    
    for sign_info in ZODIAC_SIGNS:
        start_month, start_day = sign_info["start_date"]
        end_month, end_day = sign_info["end_date"]
        
        # Handle special case for Capricorn (spans December to January)
        if start_month == 12 and end_month == 1:
            if (month == 12 and day >= start_day) or (month == 1 and day <= end_day):
                return sign_info
        # Normal case
        elif (month == start_month and day >= start_day) or (month == end_month and day <= end_day):
            return sign_info
    
    # Default to Aries if something goes wrong
    return ZODIAC_SIGNS[0]

# List of questions for the form
QUESTIONS = [
    "What activities or tasks make you lose track of time?",
    "When do you feel most alive and energized?",
    "What are you naturally good at?",
    "What do others often compliment you on or come to you for help with?",
    "What challenges or problems do you enjoy solving?",
    "What topics do you find yourself constantly researching or learning about?",
    "What work would you do even if you weren't paid for it?",
    "What issues in the world deeply concern you?",
    "What change would you most like to see in the world?",
    "What experiences have shaped who you are today?",
    "What are your core values? What principles do you refuse to compromise on?",
    "What do you want your legacy to be?",
    "What would make you feel proud of yourself at the end of your life?",
    "What does success mean to you personally?",
    "What are your most meaningful relationships and why?",
    "What environments help you thrive?",
    "What patterns do you notice in your interests and activities?",
    "What did you love doing as a child?",
    "If you had unlimited resources, how would you spend your time?",
    "What would you do if you knew you couldn't fail?",
    "What's holding you back from pursuing your dreams?",
    "What fears or limiting beliefs do you need to overcome?",
    "What skills or knowledge would you like to develop?",
    "What small step could you take today toward a more fulfilling life?",
    "What does your ideal day look like?"
]

def get_question_text(question_number):
    """
    Get the text for a specific question number.
    Question numbers are 1-indexed.
    """
    if 1 <= question_number <= len(QUESTIONS):
        return QUESTIONS[question_number - 1]
    return f"Question {question_number}"
