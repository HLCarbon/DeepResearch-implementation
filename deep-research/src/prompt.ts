//#region always sent
export const systemPrompt = () => {
  const now = new Date().toISOString();
  return `You are an expert researcher. Today is ${now}. Follow these instructions when responding:
  - You may be asked to research subjects that is after your knowledge cutoff, assume the user is right when presented with news.
  - The user is a highly experienced analyst, no need to simplify it, be as detailed as possible and make sure your response is correct.
  - Be highly organized.
  - Suggest solutions that I didn't think about.
  - Be proactive and anticipate my needs.
  - Provide detailed explanations, I'm comfortable with lots of detail.
  - Consider new technologies and contrarian ideas, not just the conventional wisdom.
  - You may use high levels of speculation or prediction, just flag it for me.`;
};

export const getSchemaPrompt = (schema:string)=>{

  return `CRITICAL INSTRUCTIONS FOR RESPONSE FORMAT:
  1. You MUST respond with ONLY pure JSON
  3. NO explanations or additional text
  4. The JSON must EXACTLY match this schema (pay special attention to array vs string types):
  ${schema}`
}



//#endregion always sent

export const followUpQuestionsPrompt = (numQuestions:number, query:string) =>{
  return `Given the following query from the user, ask some follow-up questions to clarify the research direction.
  Ensure the response includes a maximum of ${numQuestions} questions:
  <query>${query}</query>`

}

export const getSearchQueriesQuery = (numQueries:number, query:string, learnings:string[]|undefined) =>{
 return `Given the following prompt from the user, generate a list of SERP queries to research the topic.
 Return a maximum of ${numQueries} queries. Imagine you are an experinced researcher using google search.
  Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n${
        learnings ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join('\n',)}`
          : ''}`
}

export const processSearchResult = (query:string, numLearnings:number, contents:string[]) =>{
return`Given the following contents from a SERP search for the query <query>${query}</query>, 
  generate a list of learnings from the contents. Return a maximum of ${numLearnings} learnings, 
  but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. 
  The learnings should be as detailed and information dense as possible.
 Make sure to include any entities like people, places, companies, products, things, etc in the learnings,
  as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.
  \n\n<contents>${contents.map(content => `<content>\n${content}\n</content>`)
        .join('\n')}</contents>` + `schema: {"learnings":[], "followUpQuestions:[]"}`
}



export const finalReport = (prompt:string, learningsString:string) =>{
  return `Given the following prompt from the user, write a final report on the topic using the learnings from research.
   Make it as as detailed as possible, aim for 3 or more pages,
    include ALL the learnings from research:\n\n<prompt>${prompt}</prompt>
    \n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`
}