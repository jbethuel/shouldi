// Messages that the extension shows without a server response. Server messages come from the API.

export const MESSAGES = {
  noResume: "Add your resume to start.",
  cannotRead: "We cannot read this type of page.",
  notJobPosting:
    "We could not find a job posting on this page. Open a job posting, or select the job text, and try again.",
  textCut: "We used the first part of the job text.",
  rateLimited: "Please wait one minute, then try again.",
  tryAgain: "We cannot assess this job now. Please try again in a few minutes.",
} as const;

export const RESUME_NOTICE = {
  title: "Your PDF stays on this computer",
  local:
    "The extension reads the file here and never uploads it to a server. It removes your name, email addresses, phone numbers, and links.",
  sent: "When you assess a job, the extension sends the resume text below to our server. Our server sends it to TypeSafe for the assessment. Our server does not keep it. TypeSafe does not use it to train AI models.",
} as const;
