import {
  PRODUCT_LEGAL_LAST_UPDATED,
  PRODUCT_LEGAL_NAME,
  PRODUCT_LEGAL_REGION,
  PRODUCT_NAME,
  PRODUCT_SUPPORT_EMAIL,
} from "@/lib/brand";
import type { LegalBundle } from "@/lib/legal/types";

const contactLine = `For any questions regarding our services, please contact ${PRODUCT_LEGAL_NAME} by email at ${PRODUCT_SUPPORT_EMAIL}.`;

export const legalEn: LegalBundle = {
  privacy: {
    title: "Privacy Policy",
    lastUpdatedLabel: "Last updated",
    lastUpdated: PRODUCT_LEGAL_LAST_UPDATED,
    intro: [
      `This Privacy Policy explains how ${PRODUCT_NAME} (“${PRODUCT_NAME},” “we,” “our,” or “us”) collects, uses, stores, shares and protects personal information when you access or use our website, AI marketing tools, image generation tools, video generation tools, editing workspace, templates and related services.`,
      `By using ${PRODUCT_NAME}, you agree to the collection and use of information in accordance with this Privacy Policy.`,
    ],
    sections: [
      {
        heading: "1. Information We Collect",
        paragraphs: [
          "Account information: name, email address, company name, login credentials, billing or subscription status, and communication records with our support team.",
          "User content: product images, brand logos, text, captions, slogans, campaign descriptions, reference images, public social media post links, website links, product descriptions, service descriptions, prompts, generated prompts, scripts, storyboards, generated images, generated videos and marketing materials.",
          "AI processing data: style analysis, color analysis, layout and composition analysis, tone analysis, prompt generation, storyboard generation, image generation, video generation, creative editing, template usage and output history.",
          "Payment information: payment details may be processed by third-party payment providers. We do not store full credit card numbers unless expressly stated by the payment provider.",
          "Technical and usage information: IP address, browser type, device information, operating system, pages visited, time spent on pages, clickstream data, log files, error reports, cookies and similar technologies.",
        ],
      },
      {
        heading: "2. How We Use Information",
        paragraphs: [
          `We use information to provide and operate ${PRODUCT_NAME}; analyze uploaded images, reference links and user materials; generate prompts, scripts, storyboards, images, videos, captions and marketing assets; allow users to edit generated content; process payments and subscriptions; provide customer support; improve platform performance and user experience; detect abuse, fraud, security risks or prohibited use; comply with legal obligations; and communicate service updates and product changes where permitted.`,
        ],
      },
      {
        heading: "3. AI Processing and Third-Party Providers",
        paragraphs: [
          `${PRODUCT_NAME} may use third-party AI models, infrastructure providers, cloud providers, payment processors, analytics tools and other technology vendors. When you upload images, paste reference links or generate content, User Content may be processed by these providers solely for delivering requested services, maintaining reliability, preventing abuse and protecting platform security. Unless separately disclosed, we do not sell your personal information to advertisers.`,
        ],
      },
      {
        heading: "4. User Content and Training",
        paragraphs: [
          `You retain ownership of User Content you upload to ${PRODUCT_NAME}. We may use User Content to provide the service, generate outputs, store project history, troubleshoot issues, improve safety and support your account. We will not intentionally disclose private User Content to other users without permission.`,
          `If ${PRODUCT_NAME} later introduces product improvement, model evaluation or training features using customer content, we will provide additional notice or settings where required by law.`,
        ],
      },
      {
        heading: "5. Reference Images and Competitor Materials",
        paragraphs: [
          `${PRODUCT_NAME} allows users to upload reference images or paste public post links so AI can analyze visual style, tone, layout, color, structure and creative direction. Users are responsible for ensuring they have the right to use any reference material they submit. The service is intended to help users generate original marketing materials for their own products, services and brands, not to copy third-party creative works.`,
        ],
      },
      {
        heading: "6. Cookies and Tracking Technologies",
        paragraphs: [
          "We may use cookies and similar technologies to keep users logged in, remember preferences, analyze website traffic, improve product experience, measure campaign performance and prevent fraud or abuse. You can control cookies through browser settings, but some features may not function properly if cookies are disabled.",
        ],
      },
      {
        heading: "7. How We Share Information",
        paragraphs: [
          "We may share information with cloud hosting providers, AI model providers, payment processors, analytics providers, customer support tools, security and fraud prevention providers, professional advisers and legal authorities where required by law.",
        ],
      },
      {
        heading: "8. Data Retention",
        paragraphs: [
          `We retain personal information and User Content for as long as necessary to provide the service, maintain user accounts, store project history, process payments, resolve disputes, comply with legal obligations and enforce our Terms of Service. Users may request deletion by contacting ${PRODUCT_SUPPORT_EMAIL}.`,
        ],
      },
      {
        heading: "9. Data Security",
        paragraphs: [
          "We use reasonable administrative, technical and organizational safeguards to protect personal information. However, no online service can guarantee complete security. Users are responsible for maintaining the confidentiality of login credentials.",
        ],
      },
      {
        heading: "10. International Data Transfers",
        paragraphs: [
          `If you access ${PRODUCT_NAME} from outside the country or region where our servers or service providers are located, your information may be transferred to and processed in other jurisdictions, subject to applicable law.`,
        ],
      },
      {
        heading: "11. Your Rights",
        paragraphs: [
          `Depending on your location, you may have rights to access, correct, delete, object to processing, request portability, withdraw consent and opt out of marketing communications. To exercise these rights, contact ${PRODUCT_SUPPORT_EMAIL}.`,
        ],
      },
      {
        heading: "12. Children’s Privacy",
        paragraphs: [
          `${PRODUCT_NAME} is not intended for children under the age of 13 or the minimum age required in your jurisdiction. We do not knowingly collect personal information from children.`,
        ],
      },
      {
        heading: "13. Changes to This Privacy Policy",
        paragraphs: [
          `We may update this Privacy Policy from time to time. The updated version will be posted on this page with a revised “Last updated” date. Continued use of ${PRODUCT_NAME} after changes means you accept the updated policy.`,
        ],
      },
      {
        heading: "14. Contact Us",
        paragraphs: [contactLine],
      },
    ],
  },

  terms: {
    title: "Terms of Service",
    lastUpdatedLabel: "Last updated",
    lastUpdated: PRODUCT_LEGAL_LAST_UPDATED,
    intro: [
      `These Terms of Service (“Terms”) govern your access to and use of ${PRODUCT_NAME} and its related websites, AI tools, templates, image generation tools, video generation tools, editing workspace and services.`,
      `By accessing or using ${PRODUCT_NAME}, you agree to these Terms. If you do not agree, you must not use the service.`,
    ],
    sections: [
      {
        heading: `1. About ${PRODUCT_NAME}`,
        paragraphs: [
          `${PRODUCT_NAME} is an AI marketing content platform that helps users generate and edit marketing materials, including images, videos, prompts, storyboards, captions, social media posts, product visuals, service advertisements and related creative assets.`,
          "The platform may allow users to upload product images, upload brand logos, paste public post links or website links, use reference images for style analysis, generate editable prompts, generate captions and marketing copy, generate storyboards before video generation, generate images or videos, edit generated content and export content for platforms such as Instagram, RedNote, Facebook, TikTok, YouTube and other channels.",
        ],
      },
      {
        heading: "2. Eligibility",
        paragraphs: [
          `You must be at least 13 years old, or the minimum age required in your jurisdiction, to use ${PRODUCT_NAME}. If you use the service on behalf of a company, you represent that you have authority to bind that company to these Terms.`,
        ],
      },
      {
        heading: "3. User Accounts",
        paragraphs: [
          "You are responsible for providing accurate account information, keeping your login credentials secure, all activity under your account and notifying us immediately of unauthorized access. We may suspend or terminate accounts that violate these Terms, misuse the service or create security or legal risks.",
        ],
      },
      {
        heading: "4. User Content",
        paragraphs: [
          `You retain ownership of images, logos, text, links, product descriptions, service descriptions, reference materials and other content you upload or provide. By submitting User Content, you grant ${PRODUCT_NAME} a limited, worldwide, non-exclusive license to host, process, analyze, modify, generate outputs from, display and store such content solely as necessary to provide and improve the service, operate user projects, troubleshoot issues and enforce these Terms. You represent that you have all rights necessary to submit and use your User Content.`,
        ],
      },
      {
        heading: "5. Generated Content",
        paragraphs: [
          `Subject to these Terms, you may use content generated by ${PRODUCT_NAME} for lawful personal or commercial purposes.`,
          `You understand that AI-generated content may not be unique, similar outputs may be generated for other users, ${PRODUCT_NAME} does not guarantee that generated content is free from third-party rights, and you are responsible for reviewing outputs before publishing, advertising, selling or using them commercially.`,
          "You should not rely on generated content as legal, financial, medical or professional advice. You are responsible for ensuring generated content complies with advertising laws, platform rules, intellectual property laws and applicable regulations.",
        ],
      },
      {
        heading: "6. Reference Materials and Competitor Style",
        paragraphs: [
          "The purpose of reference features is to analyze general creative direction such as color, composition, tone, structure and layout. It is not intended to copy or reproduce protected third-party content.",
          `You agree not to use ${PRODUCT_NAME} to copy a competitor’s copyrighted work, misuse third-party trademarks or logos, impersonate another brand, mislead customers about the origin of a product or service, or generate content that infringes intellectual property rights.`,
        ],
      },
      {
        heading: "7. Editing Tools",
        paragraphs: [
          `${PRODUCT_NAME} may provide an editing workspace that allows users to modify generated content, remove elements, add text, insert diagrams, upload logos, change layouts or adjust marketing assets. You are responsible for any edits you make and for ensuring final content is lawful, accurate and suitable for publication.`,
        ],
      },
      {
        heading: "8. Storyboard Approval and Video Generation",
        paragraphs: [
          `${PRODUCT_NAME} may first generate a storyboard, scene plan, script or preview structure before creating the final video. This workflow helps users review the concept before consuming additional AI generation credits or paid resources. Once a user approves a storyboard and proceeds with image or video generation, credits or fees may be consumed and may not be refundable except as stated in the Refund Policy.`,
        ],
      },
      {
        heading: "9. Acceptable Use",
        paragraphs: [
          `You may not use ${PRODUCT_NAME} to create, upload, publish or distribute unlawful, fraudulent, deceptive or harmful content; content that infringes intellectual property rights; impersonation content; malware, phishing or spam; violent, hateful, harassing or discriminatory content; explicit sexual content involving minors; privacy or publicity rights violations; misleading financial, medical, legal or guaranteed outcome claims; content that violates advertising platform policies; attempts to bypass safety systems; automated scraping; reverse engineering or unauthorized access.`,
        ],
      },
      {
        heading: "10. Commercial Use and Advertising Responsibility",
        paragraphs: [
          `${PRODUCT_NAME} is a tool for generating marketing content. We do not guarantee that generated content will increase sales, improve conversion rates, pass advertising review or comply with all platform policies. Before publishing or running ads, you are responsible for reviewing product claims, service claims, pricing information, promotions, disclaimers, intellectual property rights, platform advertising rules and local laws.`,
        ],
      },
      {
        heading: "11. Fees, Credits and Subscriptions",
        paragraphs: [
          `${PRODUCT_NAME} may offer free services, paid subscriptions, credit packages, enterprise plans or usage-based billing. Paid features may include AI image generation, AI video generation, prompt generation, storyboard generation, premium templates, advanced editing tools, high-resolution exports, commercial usage features and team or agency features. Credits may be consumed when users generate, regenerate, export or process content. Unused credits may expire according to the plan or offer shown at purchase (currently six months from grant, spending oldest credits first).`,
        ],
      },
      {
        heading: "12. Subscription Renewal and Cancellation",
        paragraphs: [
          "If you purchase a recurring subscription, it may automatically renew unless cancelled before the renewal date. Cancelling a subscription prevents future renewal but does not automatically refund past payments unless required by law or stated in the Refund Policy.",
        ],
      },
      {
        heading: "13. Third-Party Services",
        paragraphs: [
          `${PRODUCT_NAME} may integrate with third-party tools, AI models, hosting providers, payment processors, analytics services or social platforms. Your use of third-party services may be subject to their own terms and privacy policies. ${PRODUCT_NAME} is not responsible for third-party services, outages, pricing changes or external platform decisions.`,
        ],
      },
      {
        heading: "14. Beta Features",
        paragraphs: [
          "Some features may be released as beta, preview, trial or experimental features. These features may be changed, limited, suspended or discontinued at any time and may produce inaccurate or unexpected results.",
        ],
      },
      {
        heading: "15. Intellectual Property",
        paragraphs: [
          `${PRODUCT_NAME}, including its software, interface, workflows, templates, branding, logo, design and technology, is owned by ${PRODUCT_NAME} or its licensors. You may not copy, modify, reverse engineer, resell or exploit our platform except as expressly permitted by these Terms.`,
        ],
      },
      {
        heading: "16. Service Availability",
        paragraphs: [
          "We aim to provide reliable service, but do not guarantee uninterrupted or error-free access. The service may be unavailable due to maintenance, outages, third-party issues, model provider limitations or technical problems.",
        ],
      },
      {
        heading: "17. Disclaimer of Warranties",
        paragraphs: [
          `${PRODUCT_NAME} is provided on an “as is” and “as available” basis. To the maximum extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, reliability and availability.`,
        ],
      },
      {
        heading: "18. Limitation of Liability",
        paragraphs: [
          `To the maximum extent permitted by law, ${PRODUCT_NAME} and its affiliates, officers, employees, contractors and partners will not be liable for indirect, incidental, consequential, special, punitive or exemplary damages, including lost profits, lost data, lost business, advertising rejection or reputational harm. Our total liability will not exceed the amount you paid to ${PRODUCT_NAME} in the three months before the claim arose, unless otherwise required by law.`,
        ],
      },
      {
        heading: "19. Indemnification",
        paragraphs: [
          `You agree to indemnify and hold harmless ${PRODUCT_NAME} from claims, damages, losses, liabilities, costs and expenses arising from your use of the service, User Content, generated content, violation of these Terms, violation of third-party rights or use of generated content in advertising, sales or public campaigns.`,
        ],
      },
      {
        heading: "20. Termination",
        paragraphs: [
          "We may suspend or terminate your access if you violate these Terms, create legal or security risks, fail to pay fees or misuse the service. Termination does not affect obligations that should reasonably survive, including payment obligations, intellectual property rights, disclaimers, limitations of liability and indemnification.",
        ],
      },
      {
        heading: "21. Governing Law",
        paragraphs: [
          `These Terms are governed by the laws of Hong Kong Special Administrative Region (“HKSAR”). Disputes are subject to the jurisdiction of the courts of HKSAR. Mandatory consumer protection rights under your local law continue to apply.`,
        ],
      },
      {
        heading: "22. Changes to These Terms",
        paragraphs: [
          "We may update these Terms from time to time. The updated version will be posted on this page with a revised “Last updated” date. Continued use after changes means you accept the updated Terms.",
        ],
      },
      {
        heading: "23. Contact Us",
        paragraphs: [contactLine],
      },
    ],
  },

  refund: {
    title: "Refund Policy",
    lastUpdatedLabel: "Last updated",
    lastUpdated: PRODUCT_LEGAL_LAST_UPDATED,
    intro: [
      `This Refund Policy explains how refunds, cancellations, subscription payments and AI generation credits are handled by ${PRODUCT_NAME}. By purchasing a subscription, credit package or paid service, you agree to this Refund Policy.`,
    ],
    sections: [
      {
        heading: "1. General Principle",
        paragraphs: [
          `${PRODUCT_NAME} provides AI-powered marketing content generation services. Because AI image generation, video generation, prompt generation, storyboard generation, processing, rendering and export may consume computational resources and third-party model costs, fees for used services and consumed credits are generally non-refundable.`,
        ],
      },
      {
        heading: "2. Free Trials and Signup Credits",
        paragraphs: [
          `${PRODUCT_NAME} may offer free trials, free signup credits, limited previews or early access campaigns. New Free accounts may receive a one-time signup credit grant (currently 300 tokens) that does not renew monthly.`,
          `The optional 7-day Pro trial requires a valid payment card. During the trial you receive bonus tokens and Pro-tier features. If you cancel during the trial in Account before the trial ends, Pro features end immediately, remaining tokens stay on your account, and you are not charged the Pro subscription fee. If you do not cancel, the trial converts to a paid monthly Pro subscription and billing continues under Stripe.`,
          `We may modify, limit or discontinue free trials or signup grants at any time. Abuse of trials, including creating multiple accounts to obtain additional free usage, may result in account suspension.`,
        ],
      },
      {
        heading: "3. Subscription Refunds",
        paragraphs: [
          "If you purchase a paid subscription and have not used any paid features, consumed credits, generated premium content, exported premium assets or accessed paid services, you may request a refund within 14 calendar days of the initial purchase.",
          "Once paid features or credits have been used, the subscription fee is generally non-refundable.",
          "Examples of usage that may make a subscription non-refundable include generating images, generating videos, generating or regenerating storyboards, generating premium prompts, using premium templates, exporting high-resolution assets, removing watermark, using premium editing tools or using paid AI processing credits.",
        ],
      },
      {
        heading: "4. Credit Package Refunds",
        paragraphs: [
          "Credit packages, generation credits or usage-based balances are refundable only if the request is made within 14 calendar days of purchase and no credits from that package have been used. Partially used credit packages are generally non-refundable.",
        ],
      },
      {
        heading: "5. Video Generation and Storyboard Workflow",
        paragraphs: [
          `If a user approves a storyboard and proceeds to final image or video generation, the related credits or fees may be consumed and are generally non-refundable. If a technical failure occurs and no usable output is delivered, ${PRODUCT_NAME} may, at its discretion, provide regeneration, replacement credits, partial credit return, technical support or refund where required by law.`,
        ],
      },
      {
        heading: "6. AI Output Quality",
        paragraphs: [
          "AI-generated results may vary. We do not guarantee that every output will perfectly match user expectations, brand preferences, reference materials or advertising requirements.",
          "Refunds are generally not provided solely because the user does not like the creative direction, changes their mind, the output requires editing, the output is not approved by a third-party platform, the user submitted unclear or low-quality input, or the user did not review the storyboard before approving generation. Where appropriate, we may provide regeneration options, editing tools or replacement credits.",
        ],
      },
      {
        heading: "7. Duplicate Charges and Billing Errors",
        paragraphs: [
          `If you believe you were charged incorrectly, charged twice or billed after cancellation, contact ${PRODUCT_SUPPORT_EMAIL} within 30 days of the charge. If we confirm a billing error, we will provide a refund or correction.`,
        ],
      },
      {
        heading: "8. Subscription Cancellation",
        paragraphs: [
          "You may cancel your subscription at any time through account settings or by contacting support. Cancellation stops future renewal. It does not automatically refund previous payments unless the refund request meets this Refund Policy or applicable law requires otherwise.",
          "For paid subscriptions, after you schedule cancellation you may continue to access paid features until the end of the current billing period, unless otherwise stated.",
          "If you cancel during an active 7-day Pro trial before it converts to paid, Pro features end immediately while unused tokens remain on your account.",
        ],
      },
      {
        heading: "9. Promotional Discounts and Trial Offers",
        paragraphs: [
          "Discounted plans, promotional offers, early access pricing and special trial campaigns may have separate refund terms. If separate terms are shown at checkout, those terms will apply.",
        ],
      },
      {
        heading: "10. Enterprise or Custom Plans",
        paragraphs: [
          "Enterprise, agency, custom or manually invoiced plans may be subject to separate written agreements. Unless otherwise stated, enterprise and custom plan payments are non-refundable once service setup, onboarding, custom development or usage has begun.",
        ],
      },
      {
        heading: "11. How to Request a Refund",
        paragraphs: [
          `To request a refund, contact ${PRODUCT_SUPPORT_EMAIL} with your account email, order number or invoice number, purchase date, plan or credit package purchased and reason for the refund request. We may ask for additional information to verify the transaction. Approved refunds will be processed to the original payment method where possible. Processing time depends on the payment provider.`,
        ],
      },
      {
        heading: "12. Changes to This Refund Policy",
        paragraphs: [
          "We may update this Refund Policy from time to time. The updated version will be posted on this page with a revised “Last updated” date.",
        ],
      },
      {
        heading: "13. Contact Us",
        paragraphs: [contactLine],
      },
    ],
  },
};
