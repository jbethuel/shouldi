// Messages that the extension shows without a server response. Server messages come from the API.

export const MESSAGES = {
  noResume: "Add your resume to start.",
  cannotRead: "ShouldI cannot read this type of page.",
  notJobPosting:
    "We could not find a job posting on this page. Open a job posting, or select the job text, and try again.",
  textCut: "We used the first part of the job text.",
  rateLimited: "Please wait one minute, then try again.",
  tryAgain: "We cannot assess this job now. Please try again in a few minutes.",
} as const;

export const RESUME_NOTICE = {
  removeTitle: "Remove your personal details before you save.",
  removeBody:
    "Remove your address and all other details that can identify you. The extension automatically removes email addresses, phone numbers, links, and the name in your settings.",
  staysTitle: "Your resume stays on this computer.",
  staysBody:
    "When you assess a job, the extension sends the resume text without your contact details to our server. Our server sends it to TypeSafe for the assessment. Our server does not keep it. TypeSafe does not use it to train AI models.",
} as const;
