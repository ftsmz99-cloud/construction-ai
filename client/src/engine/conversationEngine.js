export const flow = [
  {
    key: "name",
    question: "Great! First, what's your name?"
  },
  {
    key: "phone",
    question: "Thanks! What's the best phone number to reach you?"
  },
  {
    key: "project",
    question: "What type of project do you need help with?"
  },
  {
    key: "location",
    question: "Where is the project located?"
  },
  {
    key: "description",
    question: "Could you describe the project in a little more detail?"
  },
  {
    key: "photos",
    question: "If possible, could you send a few photos of the project? (Optional)"
  }
];

export function getNextQuestion(data) {
  for (const step of flow) {
    if (!data[step.key]) {
      return step.question;
    }
  }

  return "Perfect! I have everything I need. Our team will review your request and contact you shortly.";
}