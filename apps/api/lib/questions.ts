import { noul, score } from "@typesafe-ai/sdk";

// State shape sent to Jev: { job: { text }, resume: { text } }.
// Score criteria are ordered from level 0 to level 4 and describe situations, not degrees.

export const questions = {
  is_job_posting: noul("Is `job.text` a job posting that describes one open role that a person can apply for?", {
    true: "The text describes one open role, for example a job title with duties, requirements, or a way to apply.",
    false:
      "The text is not a job posting for one role, for example a list of many jobs, search results, a company page, a news article, a login page, or an unrelated page.",
  }),

  skills: score(
    "Compare the skills that `job.text` asks for with the skills that `resume.text` shows. A skill counts as shown when the resume names it or describes work that clearly uses it.",
    [
      "The resume shows none of the skills that the job asks for.",
      "The resume shows a few of the skills that the job asks for; most of the required skills do not appear.",
      "The resume shows roughly half of the skills that the job asks for.",
      "The resume shows most of the skills that the job asks for; one or two required skills do not appear.",
      "The resume shows all or almost all of the skills that the job asks for.",
    ],
  ),

  tasks: score("Compare the main tasks and responsibilities in `job.text` with the work that `resume.text` describes.", [
    "The resume describes no work that is similar to the main tasks of the job.",
    "The resume describes related work, but not the same tasks as the job.",
    "The resume describes some of the main tasks of the job.",
    "The resume describes most of the main tasks of the job.",
    "The resume describes all the main tasks of the job, done at the same size or larger.",
  ]),

  experience: score(
    "Compare the seniority level or years of experience that `job.text` asks for with the seniority and years of relevant experience that `resume.text` shows. Count only experience in the kind of work that the job describes; experience in unrelated work does not count.",
    [
      "The resume shows a seniority two or more steps lower than the job asks for, for example entry level for a senior role.",
      "The resume shows a seniority one step lower than the job asks for, and three or more years less experience.",
      "The resume shows a seniority one step lower than the job asks for, or one to two years less experience.",
      "The resume shows almost the same seniority as the job asks for, with a small gap.",
      "The resume shows the same seniority as the job asks for, or a higher seniority.",
    ],
  ),

  industry: score("Compare the industry of the role in `job.text` with the industries of the work in `resume.text`.", [
    "The resume shows no work in the same industry as the job or in a related industry.",
    "The resume shows work in a related industry only, not in the same industry.",
    "The resume shows a short job, or part of a job, in the same industry.",
    "The resume shows one or more full jobs in the same industry.",
    "The resume shows many years in the same industry, with the same type of product or customer as the job.",
  ]),

  education: score(
    "Compare the degrees, licenses, and certificates that `job.text` asks for with the education, licenses, and certificates in `resume.text`.",
    [
      "The resume shows none of the degrees, licenses, or certificates that the job asks for.",
      "The resume shows related education, but not the degrees, licenses, or certificates that the job asks for.",
      "The resume shows some of the items that the job asks for, or an equivalent that the job accepts, such as equivalent experience.",
      "The resume shows most of the degrees, licenses, and certificates that the job asks for.",
      "The resume shows all the degrees, licenses, and certificates that the job asks for.",
    ],
  ),

  experience_stated: noul(
    "Does `job.text` state a required or preferred seniority level or number of years of experience?",
  ),

  industry_stated: noul(
    "Does `job.text` show the industry of the role, for example by naming the industry, the type of product, or the type of customer?",
  ),

  education_stated: noul("Does `job.text` state a required or preferred degree, license, or certificate?"),
} as const;

export type Questions = typeof questions;
