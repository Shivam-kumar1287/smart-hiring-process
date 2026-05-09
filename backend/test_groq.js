import Groq from 'groq-sdk';
const groq = new Groq({apiKey: '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'});
groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{role: 'system', content: 'Return a JSON object: { "test": 1 }'}, {role: 'user', content: 'test'}],
  response_format: {type: 'json_object'}
}).then(res => console.log(res.choices[0].message.content)).catch(console.error);
