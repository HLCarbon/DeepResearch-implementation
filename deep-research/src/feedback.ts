import { generateObject } from 'ai';
import { z } from 'zod';

import { checkRateLimit, generateWithGemini, o3MiniModel } from './ai/providers';
import { followUpQuestionsPrompt, systemPrompt } from './prompt';

export async function generateFeedback({
  query,
  numQuestions = 3,
}: {
  query: string;
  numQuestions?: number;
}) {
  const userFeedback = await generateWithGemini({
    model: o3MiniModel,
    system: systemPrompt(),
    prompt: followUpQuestionsPrompt(numQuestions, query),
    schema: z.object({
      questions: z
        .array(z.string())
        .describe(`Follow up questions to clarify the research direction, max of ${numQuestions}`,),
    }),
  });

  return userFeedback.object.questions.slice(0, numQuestions);
}
