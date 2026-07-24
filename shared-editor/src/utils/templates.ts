export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  content: string;
}

const T: Template[] = [
  // === Meeting & Work ===
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    description: "Structured meeting agenda with action items",
    category: "Work",
    icon: "Users",
    content: `# Meeting Notes

**Date:** {{date}}
**Attendees:**
**Project:**

## Agenda
1.
2.
3.

## Discussion Notes

## Action Items
- [ ] 
- [ ] 
- [ ] 

## Next Steps`,
  },
  {
    id: "weekly-planning",
    name: "Weekly Planning",
    description: "Plan your week with priorities and goals",
    category: "Work",
    icon: "Calendar",
    content: `# Weekly Planning — Week {{date:week}}

## Top 3 Priorities
1.
2.
3.

## Monday
- [ ] 

## Tuesday
- [ ] 

## Wednesday
- [ ] 

## Thursday
- [ ] 

## Friday
- [ ] 

## Notes & Reflections`,
  },
  {
    id: "project-proposal",
    name: "Project Proposal",
    description: "Formal project proposal template",
    category: "Work",
    icon: "FileText",
    content: `# Project Proposal

## Executive Summary

## Problem Statement

## Proposed Solution

## Scope
### In Scope
### Out of Scope

## Timeline
| Phase | Dates | Deliverables |
|-------|-------|--------------|
|       |       |              |
|       |       |              |
|       |       |              |

## Resources Needed

## Success Criteria`,
  },
  {
    id: "brainstorming",
    name: "Brainstorming",
    description: "Free-form brainstorming canvas",
    category: "Work",
    icon: "Lightbulb",
    content: `# Brainstorming Session

**Date:** {{date}}
**Topic:**

## Ideas
- 
- 
- 

## Related Concepts

## Questions

## Next Steps`,
  },
  {
    id: "retrospective",
    name: "Sprint Retrospective",
    description: "What went well, what to improve",
    category: "Work",
    icon: "RefreshCw",
    content: `# Sprint Retrospective

**Sprint:** 
**Date:** {{date}}

## 🌟 What Went Well
- 
- 
- 

## 🔧 What Could Improve
- 
- 
- 

## 🚀 Action Items
- [ ] 
- [ ] 
- [ ] 

## 💡 Ideas for Next Sprint`,
  },

  // === Personal ===
  {
    id: "daily-journal",
    name: "Daily Journal",
    description: "Daily reflection and gratitude journal",
    category: "Personal",
    icon: "BookOpen",
    content: `# {{date}}

## Morning Intentions
What do I want to accomplish today?

## Gratitude
1.
2.
3.

## Highlights
-

## Challenges
-

## Evening Reflection
What did I learn today?

## Tomorrow's Focus`,
  },
  {
    id: "habit-tracker",
    name: "Habit Tracker",
    description: "Track daily habits and streaks",
    category: "Personal",
    icon: "CheckSquare",
    content: `# Habit Tracker — {{date:month}}

## Habits
- [ ] Morning meditation
- [ ] Exercise (30 min)
- [ ] Read (20 min)
- [ ] Drink 8 glasses of water
- [ ] Journal
- [ ] No screen 1h before bed

## Weekly Streak
| Week | M | T | W | T | F | S | S |
|------|---|---|---|---|---|---|---|
| 1    |   |   |   |   |   |   |   |
| 2    |   |   |   |   |   |   |   |
| 3    |   |   |   |   |   |   |   |
| 4    |   |   |   |   |   |   |   |

## Notes`,
  },
  {
    id: "goal-setting",
    name: "Goal Setting (OKR)",
    description: "Objectives and Key Results template",
    category: "Personal",
    icon: "Target",
    content: `# OKR — {{date:quarter}}

## Objective 1
- KR 1.1:
- KR 1.2:
- KR 1.3:

## Objective 2
- KR 2.1:
- KR 2.2:
- KR 2.3:

## Objective 3
- KR 3.1:
- KR 3.2:

## Action Plan`,
  },
  {
    id: "book-notes",
    name: "Book Notes",
    description: "Capture key takeaways from books",
    category: "Personal",
    icon: "Book",
    content: `# Book Notes

**Title:** 
**Author:**
**Date Read:** {{date}}

## Key Takeaways
1.
2.
3.

## Favorite Quotes
> 

## Summary

## Actionable Items
- [ ] 
- [ ] 

## Related Books`,
  },
  {
    id: "workout-log",
    name: "Workout Log",
    description: "Track exercises and progress",
    category: "Personal",
    icon: "Activity",
    content: `# Workout Log — {{date}}

**Type:** 
**Duration:**
**Intensity:**

## Exercises
| Exercise | Sets | Reps | Weight | Notes |
|----------|------|------|--------|-------|
|          |      |      |        |       |
|          |      |      |        |       |
|          |      |      |        |       |

## Cardio
- Type:
- Duration:
- Distance:

## Notes & Feelings`,
  },

  // === Academic ===
  {
    id: "lecture-notes",
    name: "Lecture Notes",
    description: "Structured notes for classes and lectures",
    category: "Academic",
    icon: "GraduationCap",
    content: `# Lecture Notes

**Course:**
**Date:** {{date}}
**Topic:**

## Key Concepts
- 
- 
- 

## Detailed Notes

## Questions
- 
- 

## Summary

## References`,
  },
  {
    id: "research-paper",
    name: "Research Paper Summary",
    description: "Summarize academic papers",
    category: "Academic",
    icon: "FileText",
    content: `# Paper Summary

**Title:**
**Authors:**
**Year:**
**DOI/URL:**

## Research Question

## Methodology

## Key Findings
1.
2.
3.

## Limitations

## Relevance to My Work

## Citations to Follow`,
  },
  {
    id: "study-plan",
    name: "Study Plan",
    description: "Exam preparation study schedule",
    category: "Academic",
    icon: "Clock",
    content: `# Study Plan

**Subject:**
**Exam Date:**

## Topics to Cover
- [ ] 
- [ ] 
- [ ] 
- [ ] 
- [ ] 

## Schedule
| Day | Topic | Duration | Status |
|-----|-------|----------|--------|
|     |       |          |        |
|     |       |          |        |
|     |       |          |        |

## Resources
- 
- 

## Practice Exams`,
  },

  // === Creative ===
  {
    id: "story-outline",
    name: "Story Outline",
    description: "Plot structure and character development",
    category: "Creative",
    icon: "Feather",
    content: `# Story Outline

**Title:**
**Genre:**
**POV:**

## Characters
- **Protagonist:**
  - Motivation:
  - Flaw:
  - Arc:
- **Antagonist:**
  - Motivation:
  - Conflict:

## Plot Structure
### Act I — Setup
- Inciting Incident:

### Act II — Confrontation
- Rising Action:
- Midpoint Twist:

### Act III — Resolution
- Climax:
- Denouement:

## Themes

## Notes`,
  },
  {
    id: "worldbuilding",
    name: "World Building",
    description: "Fictional universe creation template",
    category: "Creative",
    icon: "Globe",
    content: `# World Building

**World Name:**
**Genre:**

## Geography
- 

## History
- 

## Society & Culture
- 

## Magic / Technology
- 

## Factions
- 

## Notable Locations
- 

## Characters
- 

## Timeline
- `,
  },
  {
    id: "recipe",
    name: "Recipe",
    description: "Cooking recipe template",
    category: "Creative",
    icon: "UtensilsCrossed",
    content: `# Recipe

**Name:**
**Cuisine:**
**Prep Time:** 
**Cook Time:** 
**Servings:**

## Ingredients
- 
- 
- 

## Instructions
1.
2.
3.

## Notes
- 

## Rating`,
  },
  {
    id: "song-lyrics",
    name: "Song Lyrics / Poem",
    description: "Creative writing template for verses",
    category: "Creative",
    icon: "Music",
    content: `# 

**Key:**
**Tempo:**

## Verse 1

## Chorus

## Verse 2

## Chorus

## Bridge

## Outro`,
  },

  // === Technical ===
  {
    id: "bug-report",
    name: "Bug Report",
    description: "Structured software bug report",
    category: "Technical",
    icon: "Bug",
    content: `# Bug Report

**Title:**
**Reported:** {{date}}
**Priority:** Low / Medium / High / Critical
**Environment:**

## Steps to Reproduce
1.
2.
3.

## Expected Behavior

## Actual Behavior

## Screenshots / Logs

## Possible Cause

## Workaround

## Related Issues`,
  },
  {
    id: "api-docs",
    name: "API Documentation",
    description: "Document an API endpoint",
    category: "Technical",
    icon: "Code",
    content: `# API Docs

## Endpoint
\`GET /api/v1/\`

## Description

## Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
|           |      |          |             |

## Response
\`\`\`json
{
}
\`\`\`

## Error Codes
| Code | Description |
|------|-------------|
|      |             |

## Example
\`\`\`bash
curl 
\`\`\``,
  },
  {
    id: "architecture-decision",
    name: "Architecture Decision Record",
    description: "ADR template for technical decisions",
    category: "Technical",
    icon: "Layers",
    content: `# ADR: 

**Date:** {{date}}
**Status:** Proposed / Accepted / Deprecated

## Context

## Decision

## Consequences
### Positive
- 
- 

### Negative
- 
- 

## Alternatives Considered
- 

## References`,
  },
  {
    id: "release-notes",
    name: "Release Notes",
    description: "Software release changelog",
    category: "Technical",
    icon: "Megaphone",
    content: `# Release Notes — v

**Date:** {{date}}

## 🚀 New Features
- 
- 

## 🐛 Bug Fixes
- 
- 

## 🔧 Improvements
- 
- 

## ⚠️ Breaking Changes
- 

## 📦 Downloads`,
  },
  {
    id: "code-review",
    name: "Code Review Checklist",
    description: "Systematic code review checklist",
    category: "Technical",
    icon: "GitPullRequest",
    content: `# Code Review

**PR:** 
**Author:** 
**Reviewer:** 

## Checklist
- [ ] Code follows style guide
- [ ] No obvious bugs
- [ ] Edge cases handled
- [ ] Error handling in place
- [ ] Tests added / updated
- [ ] Documentation updated
- [ ] No security issues
- [ ] Performance considered

## Comments

## Approval`,
  },

  // === Health & Lifestyle ===
  {
    id: "meal-plan",
    name: "Meal Plan",
    description: "Weekly meal planning template",
    category: "Health",
    icon: "Apple",
    content: `# Meal Plan — Week {{date:week}}

## Monday
- Breakfast:
- Lunch:
- Dinner:

## Tuesday
- Breakfast:
- Lunch:
- Dinner:

## Wednesday
- Breakfast:
- Lunch:
- Dinner:

## Thursday
- Breakfast:
- Lunch:
- Dinner:

## Friday
- Breakfast:
- Lunch:
- Dinner:

## Saturday
- Breakfast:
- Lunch:
- Dinner:

## Sunday
- Breakfast:
- Lunch:
- Dinner:

## Grocery List`,
  },
  {
    id: "sleep-log",
    name: "Sleep Log",
    description: "Track sleep patterns and quality",
    category: "Health",
    icon: "Moon",
    content: `# Sleep Log — {{date:month}}

| Date | Bedtime | Wake | Hours | Quality | Notes |
|------|---------|------|-------|---------|-------|
|      |         |      |       |         |       |
|      |         |      |       |         |       |

## Monthly Summary
- Average hours:
- Best night:
- Worst night:

## Notes`,
  },
  {
    id: "mood-tracker",
    name: "Mood Tracker",
    description: "Track daily mood and emotional patterns",
    category: "Health",
    icon: "Heart",
    content: `# Mood Tracker — {{date:month}}

## Scale
1 = Terrible, 5 = Okay, 10 = Amazing

| Day | Mood | Energy | Notes |
|-----|------|--------|-------|
|     |      |        |       |
|     |      |        |       |

## Weekly Reflection

## Triggers & Patterns`,
  },
];

export const TEMPLATES = T;
export const CATEGORIES = [...new Set(T.map((t) => t.category))];
