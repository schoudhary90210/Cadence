"""
Cadence Learn — hardcoded course definitions.

Four courses targeting different disfluency types, each with 5 levels of
progressive difficulty. NO LLM — all content is static.
"""

import random
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Course type constants
# ---------------------------------------------------------------------------

BLOCK_COURSE = "BLOCK_COURSE"
PROLONGATION_COURSE = "PROLONGATION_COURSE"
REPETITION_COURSE = "REPETITION_COURSE"
FILLER_COURSE = "FILLER_COURSE"

ALL_COURSE_TYPES = [BLOCK_COURSE, PROLONGATION_COURSE, REPETITION_COURSE, FILLER_COURSE]

# ---------------------------------------------------------------------------
# Course data
# ---------------------------------------------------------------------------

COURSES: Dict[str, Dict[str, Any]] = {
    BLOCK_COURSE: {
        "name": "Breaking Through Blocks",
        "description": "Build confidence with single words, short phrases, and full sentences to reduce blocking.",
        "icon": "shield",
        "levels": {
            1: {
                "exercises": [
                    "Say clearly: bat, cup, dog, run, sit",
                    "Read aloud: The big red box",
                    "Say: hat, mat, cat, sat, pat",
                ],
                "pass_threshold": 80,
                "instruction": "Say each word or phrase clearly at a comfortable pace.",
                "level_type": "read",
            },
            2: {
                "exercises": [
                    "Say: butter, table, paper, never, river",
                    "Read: Better late than never",
                    "Say: garden, window, finger, simple, purple",
                ],
                "pass_threshold": 80,
                "instruction": "Focus on smooth airflow as you say each multi-syllable word.",
                "level_type": "read",
            },
            3: {
                "exercises": [
                    "The cat sat on the mat",
                    "Please pass the butter to me",
                    "I want to go to the park",
                ],
                "pass_threshold": 80,
                "instruction": "Read each sentence at a natural pace without rushing.",
                "level_type": "read",
            },
            4: {
                "exercises": [
                    "I would like a glass of cold water please",
                    "The weather today is perfect for a walk outside",
                    "Can you tell me where the nearest library is",
                ],
                "pass_threshold": 80,
                "instruction": "Maintain smooth speech through longer sentences. Pause between sentences if needed.",
                "level_type": "read",
            },
            5: {
                "exercises": [
                    "Tell me about your favorite place you've visited",
                ],
                "pass_threshold": 80,
                "instruction": "Speak spontaneously for about 30 seconds. Focus on smooth starts and steady pacing.",
                "level_type": "speak",
                "duration_hint_sec": 30,
            },
        },
    },
    PROLONGATION_COURSE: {
        "name": "Smooth Airflow",
        "description": "Practice smooth, flowing speech to reduce sound prolongations.",
        "icon": "wind",
        "levels": {
            1: {
                "exercises": [
                    "Say: bit, cut, hot, pet, bug",
                    "Read: The wet net",
                    "Say: sit, fit, kit, hit, bit",
                ],
                "pass_threshold": 80,
                "instruction": "Keep each sound short and crisp. No stretching.",
                "level_type": "read",
            },
            2: {
                "exercises": [
                    "Say: stress, crisp, trust, grasp, drift",
                    "Read: Strong winds swept the street",
                    "He grasped the crisp fresh bread",
                ],
                "pass_threshold": 80,
                "instruction": "Consonant clusters need smooth transitions. Don't hold any sound.",
                "level_type": "read",
            },
            3: {
                "exercises": [
                    "Quick brown fox jumps high",
                    "She sells seashells by the seashore",
                    "Red lorry yellow lorry red lorry",
                ],
                "pass_threshold": 80,
                "instruction": "These phrases challenge smooth airflow. Keep a steady rhythm.",
                "level_type": "read",
            },
            4: {
                "exercises": [
                    "The smooth surface seemed almost silky",
                    "Susan slowly sipped her sweet soda",
                    "Steven said the store sold silver spoons",
                ],
                "pass_threshold": 80,
                "instruction": "S-heavy sentences test prolongation control. Keep each S brief.",
                "level_type": "read",
            },
            5: {
                "exercises": [
                    "Read a paragraph at a natural pace",
                ],
                "pass_threshold": 80,
                "instruction": "Speak for about 45 seconds at a natural pace. Focus on smooth, even airflow.",
                "level_type": "speak",
                "duration_hint_sec": 45,
            },
        },
    },
    REPETITION_COURSE: {
        "name": "Clean Onsets",
        "description": "Strengthen word initiation to reduce repetitions and false starts.",
        "icon": "repeat",
        "levels": {
            1: {
                "exercises": [
                    "Say: ball, pan, ten, can, door",
                    "Say: buy, pay, tell, come, do",
                    "Say: blue, play, try, glow, free",
                ],
                "pass_threshold": 80,
                "instruction": "Say each word once, cleanly. No repeating.",
                "level_type": "read",
            },
            2: {
                "exercises": [
                    "big ball, pretty pink, dark door, tiny turtle, clear clock",
                    "careful cats, busy bees, green grass, bright blue",
                    "fast feet, slow snake, tall tree, warm wind",
                ],
                "pass_threshold": 80,
                "instruction": "Alliterative pairs — say each pair once without repeating the first sound.",
                "level_type": "read",
            },
            3: {
                "exercises": [
                    "Pretty pink petals",
                    "Tiny turtles turn",
                    "Dark deep ditches",
                ],
                "pass_threshold": 80,
                "instruction": "Alliterative phrases. Commit to the first sound and move forward.",
                "level_type": "read",
            },
            4: {
                "exercises": [
                    "She sells seashells by the seashore",
                    "Peter Piper picked a peck of pickled peppers",
                    "How much wood would a woodchuck chuck",
                ],
                "pass_threshold": 80,
                "instruction": "Classic tongue twisters. Slow is fine — accuracy over speed.",
                "level_type": "read",
            },
            5: {
                "exercises": [
                    "Describe what you did this morning in detail",
                ],
                "pass_threshold": 80,
                "instruction": "Speak spontaneously for about 30 seconds. Focus on clean word starts.",
                "level_type": "speak",
                "duration_hint_sec": 30,
            },
        },
    },
    FILLER_COURSE: {
        "name": "Confident Pausing",
        "description": "Replace filler words (um, uh, like) with confident silent pauses.",
        "icon": "pause",
        "levels": {
            1: {
                "exercises": [
                    "The dog ran across the field",
                    "She opened the door and walked inside",
                    "He finished his homework before dinner",
                ],
                "pass_threshold": 80,
                "instruction": "Read each sentence without inserting any extra words.",
                "level_type": "read",
            },
            2: {
                "exercises": [
                    "What is your name and where are you from?",
                    "What did you have for breakfast today?",
                    "What is your favorite season and why?",
                ],
                "pass_threshold": 80,
                "instruction": "Answer each question in one sentence. Use a silent pause instead of 'um'.",
                "level_type": "read",
            },
            3: {
                "exercises": [
                    "Explain what a smartphone does in 15 seconds",
                    "Describe your bedroom in 15 seconds",
                    "Tell me about your daily routine in 15 seconds",
                ],
                "pass_threshold": 80,
                "instruction": "Short timed responses. Pause silently when you need to think.",
                "level_type": "read",
            },
            4: {
                "exercises": [
                    "Explain how to make a sandwich",
                    "Describe how to get from home to school",
                    "Explain what your favorite hobby involves",
                ],
                "pass_threshold": 80,
                "instruction": "Give a clear explanation. Replace every urge to say 'um' with a brief pause.",
                "level_type": "read",
            },
            5: {
                "exercises": [
                    "Talk about something you're passionate about for 60 seconds",
                ],
                "pass_threshold": 80,
                "instruction": "Speak freely for 60 seconds. Pause silently when you need to think — no fillers.",
                "level_type": "speak",
                "duration_hint_sec": 60,
            },
        },
    },
}


# ---------------------------------------------------------------------------
# Accessor functions
# ---------------------------------------------------------------------------

def get_exercise(course_type: str, level: int) -> Optional[str]:
    """Return a random exercise string for the given course and level."""
    course = COURSES.get(course_type)
    if not course:
        return None
    level_data = course["levels"].get(level)
    if not level_data:
        return None
    return random.choice(level_data["exercises"])


def get_course_info(course_type: str) -> Optional[Dict[str, Any]]:
    """Return metadata for a single course (name, description, icon, total levels)."""
    course = COURSES.get(course_type)
    if not course:
        return None
    return {
        "course_type": course_type,
        "name": course["name"],
        "description": course["description"],
        "icon": course["icon"],
        "total_levels": len(course["levels"]),
    }


def get_all_courses() -> List[Dict[str, Any]]:
    """Return summary metadata for all courses."""
    return [
        {
            "course_type": ct,
            "name": c["name"],
            "description": c["description"],
            "icon": c["icon"],
            "total_levels": len(c["levels"]),
        }
        for ct, c in COURSES.items()
    ]
