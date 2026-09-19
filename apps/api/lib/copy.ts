import type { CriterionId, ErrorCode } from "@shouldi/shared";
import { TIME_PLACEHOLDER } from "@shouldi/shared";

// Every word the user sees in a result comes from this file. Keep the tone encouraging:
// never use "fail", "reject", "unqualified", "poor", "weak", "skip", or "not a fit".

export const CRITERION_NAMES: Record<CriterionId, string> = {
  skills: "Skills",
  tasks: "Tasks",
  experience: "Experience level",
  industry: "Industry",
  education: "Education and certificates",
};

/** Sentences indexed by level 0–4. */
export const CRITERION_SENTENCES: Record<CriterionId, readonly [string, string, string, string, string]> = {
  skills: [
    "This job uses skills that your resume does not show yet.",
    "You have some of the skills that this job asks for.",
    "You have about half of the skills that this job asks for.",
    "You have most of the skills that this job asks for.",
    "You have the skills that this job asks for.",
  ],
  tasks: [
    "The work in this job is different from your past work.",
    "Your past work is related to this job.",
    "You have done some of the main work of this job.",
    "You have done most of the main work of this job.",
    "You have done the main work of this job.",
  ],
  experience: [
    "This job asks for experience that your resume does not show yet.",
    "This job asks for more experience than your resume shows.",
    "This job asks for a little more experience than your resume shows.",
    "Your experience is close to the level of this job.",
    "Your experience matches the level of this job.",
  ],
  industry: [
    "This industry is new for you.",
    "You have worked in a related industry.",
    "You have some experience in this industry.",
    "You have worked in this industry.",
    "You know this industry well.",
  ],
  education: [
    "This job asks for education or certificates that your resume does not show yet.",
    "Your education is related to what this job asks for.",
    "You have some of the education and certificates that this job asks for.",
    "You have most of the education and certificates that this job asks for.",
    "You have the education and certificates that this job asks for.",
  ],
};

export const NOT_STATED_SENTENCES: Partial<Record<CriterionId, string>> = {
  experience: "This job does not state an experience level.",
  industry: "This job does not state an industry.",
  education: "This job does not state an education requirement.",
};

export const TIP = "Do you have a skill or experience that is not in your resume? Add it, then assess the job again.";

export const NOT_JOB_POSTING =
  "We could not find a job posting on this page. Open a job posting, or select the job text, and try again.";

const TRY_AGAIN_LATER = "We cannot assess this job now. Please try again in a few minutes.";

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  bad_request: TRY_AGAIN_LATER,
  too_large: TRY_AGAIN_LATER,
  forbidden: TRY_AGAIN_LATER,
  rate_limited: "Please wait one minute, then try again.",
  daily_limit: `You assessed many jobs today. You can assess more after ${TIME_PLACEHOLDER}.`,
  busy: `We are very busy today. Please try again after ${TIME_PLACEHOLDER}.`,
  server_error: TRY_AGAIN_LATER,
};
