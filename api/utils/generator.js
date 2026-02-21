import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// ------------------- INITIALIZE LLM -------------------
const llm = new ChatOpenAI({
  model: process.env.AI_MODEL,
  configuration: { baseURL: process.env.AI_ENDPOINT },
  apiKey: process.env.AI_API_KEY,
  temperature: 0.2,
});

// ------------------- SCHEMAS -------------------

const CourseMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const ChapterSchema = z.object({
  chapter_number: z.number(),
  title: z.string(),
  content: z.string(),
});

const ChaptersSchema = z.array(ChapterSchema);

const ChaptersOutputSchema = z.object({
  chapters: ChaptersSchema,
});

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correct_index: z.number().int().min(0).max(3),
});

const QuizSchema = z.object({
  questions: z.array(QuizQuestionSchema),
});

// ------------------- FUNCTIONS -------------------

// ===================== 1️⃣ FOUNDATION TRANSFORMATION =====================
export async function summarizeText(pdfText) {
  const prompt = `
You are a senior academic content architect and master teacher.

Transform the material below into a COMPLETE, deeply structured teaching foundation.

STRICT REQUIREMENTS:
- Do NOT shorten or compress the material.
- Preserve EVERY concept, formula, rule, and explanation.
- Expand explanations where clarity is needed.
- Organize ideas logically from foundational to advanced.
- Use simple, precise English suitable for high school level.
- When calculations appear, rewrite them step-by-step with zero skipped steps.
- Clearly define all key terms.
- Remove repetition but DO NOT remove content.
- Improve pedagogy and clarity.

STRUCTURE OUTPUT USING:
1. Core Concepts
2. Definitions
3. Principles & Rules
4. Step-by-Step Methods
5. Worked Examples
6. Common Mistakes
7. Practice Thinking Prompts

TEXT:
${pdfText.slice(0, 30000)}
`;

  const res = await llm.invoke([{ role: "user", content: prompt }]);
  return res.content;
}

// ===================== 2️⃣ COURSE METADATA =====================
export async function generateCourseMetadata(summaryText) {
  const structuredLLM = llm.withStructuredOutput(CourseMetadataSchema);

  return structuredLLM.invoke(`
Generate premium course metadata from this material.

REQUIREMENTS:
- Title: authoritative, clear, professional.
- Description: 4–6 sentences.
- Must explain:
   • What student will master
   • Skills gained
   • Practical applications
   • Difficulty level
   • Step-by-step clarity approach
- Avoid generic wording.

MATERIAL:
${summaryText}
`);
}

// ===================== 3️⃣ CHAPTER GENERATION =====================
export async function generateChapters(summaryText) {
  const structuredLLM = llm.withStructuredOutput(ChaptersOutputSchema);

  const result = await structuredLLM.invoke(`
You are a world-class high school educator with 30+ years of curriculum design experience.

Transform the material into a COMPLETE course divided into logically progressive chapters.

CRITICAL REQUIREMENTS:

1. Chapters must follow learning progression.
2. Chapter numbers start at 1 and increase sequentially.
3. Each chapter MUST contain:

   - Clear introduction (why topic matters)
   - Definitions section
   - Deep concept explanation (simple language)
   - Step-by-step worked examples
   - Real-life analogies
   - Common mistakes section
   - Mini recap summary

4. Teaching Rules:
   - SIMPLE English
   - Never skip reasoning steps
   - Never assume prior knowledge unless covered
   - Explain formulas before using them
   - Break calculations line-by-line
   - No advanced material beyond source

OUTPUT FORMAT RULES:
- content MUST be valid HTML string
- Use:
   <h2> for chapter title
   <h3> for sections
   <p> for explanations
   <ul>/<ol> for steps
   <strong> for definitions
   <div class="example"> for worked examples
   <div class="mistake"> for common mistakes
- Minimum 4–6 structured sections per chapter
- 800–1500 words per chapter (if material allows)
- Clean formatting

PEDAGOGICAL STANDARD:
Teach as if student struggles.
Clarity over sophistication.
Depth over brevity.

MATERIAL:
${summaryText}
`);

  return result.chapters;
}

// ===================== 4️⃣ QUIZ GENERATION =====================
export async function generateQuizForChapter(chapterContent) {
  const structuredLLM = llm.withStructuredOutput(QuizSchema);

  return structuredLLM.invoke(`
Create a high-quality conceptual quiz from this chapter.

STRICT RULES:
- Exactly 3 questions
- Must test understanding, not memorization
- Cover definition, application, reasoning
- 4 short options
- Only one correct answer
- No trick questions
- Do not copy text verbatim
- Progressive difficulty
- correct_index must match correct option (0–3)

CHAPTER CONTENT:
${chapterContent}
`);
}

// ===================== 5️⃣ FINAL EXAM =====================
export async function generateFinalExam(summaryText) {
  const structuredLLM = llm.withStructuredOutput(QuizSchema);

  return structuredLLM.invoke(`
Create a comprehensive final exam covering the entire course.

STRICT RULES:
- Exactly 10 questions
- 4 options each
- Only one correct answer
- correct_index 0–3
- Cover ALL major topics evenly
- Mix conceptual, computational, applied reasoning
- No repeated question ideas
- No trivial questions

Difficulty progression:
Q1–3: foundational
Q4–7: intermediate
Q8–10: advanced but fair

MATERIAL:
${summaryText}
`);
}
