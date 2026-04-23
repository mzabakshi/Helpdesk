import "dotenv/config";
import prisma from "./db";
import { SenderType, TicketStatus } from "./generated/prisma/enums";

// Find the first agent user to use as reply author
const agent = await prisma.user.findFirst({
  where: { role: "agent", deletedAt: null },
  select: { id: true, name: true },
});

if (!agent) {
  console.error("No agent user found. Run the main seed first.");
  process.exit(1);
}

const existing = await prisma.ticket.findFirst({
  where: { subject: "Cannot access my account after password reset" },
});

if (existing) {
  console.log("Tickets already seeded, skipping.");
  await prisma.$disconnect();
  process.exit(0);
}

const ticket = await prisma.ticket.create({
  data: {
    subject: "Cannot access my account after password reset",
    status: TicketStatus.open,
    body: `Hi support team,

I recently requested a password reset for my account (user ID: 84920) and received the reset email, but after following the link and setting a new password I'm still unable to log in. The error message says "Invalid credentials" even though I'm certain the new password is correct.

I've tried:
- Clearing my browser cache and cookies
- Using a different browser (Chrome and Firefox)
- Waiting 30 minutes and trying again

My account email is jane.smith@example.com. This is quite urgent as I need to access some invoices for an upcoming audit.

Thank you,
Jane Smith`,
    fromEmail: "jane.smith@example.com",
    fromName: "Jane Smith",
    status: "open",
    category: "technical_issue",
  },
});

console.log(`Created ticket: ${ticket.id}`);

// Alternating conversation between customer and agent
const conversation: Array<{ body: string; senderType: SenderType; authorId: string | null }> = [
  { senderType: SenderType.agent, authorId: agent.id, body: `Hi Jane,\n\nThank you for reaching out. I'm sorry to hear you're having trouble accessing your account.\n\nCould you please confirm the exact error message you see when trying to log in? Also, are you logging in via the web app or mobile app?\n\nBest regards,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Hi, the error says exactly: \"Invalid credentials. Please check your email and password.\" I'm using the web app at app.example.com. I've triple-checked the password I set." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Thanks for confirming, Jane.\n\nI can see your account in our system. It looks like the password reset token was applied, but there may be a caching issue on our auth server. I'm going to manually expire all active sessions for your account — please try logging in again in about 5 minutes.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "I waited 10 minutes and tried again but still getting the same error. Nothing has changed." },
  { senderType: SenderType.agent, authorId: agent.id, body: `I apologize for the continued trouble.\n\nI've escalated this to our auth team and they've confirmed there was a known issue with password resets between 2pm–4pm yesterday that may have affected your account. They're pushing a fix now.\n\nCould you try resetting your password one more time? I'll monitor your account directly.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "OK I've just done another password reset. Waiting for the email now." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Great. I can see the reset email was sent at 3:42 PM. Please use the link within 15 minutes as reset tokens expire.\n\nI'm standing by.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Got the email. Clicked the link and set a new password. Trying to log in now..." },
  { senderType: SenderType.customer, authorId: null, body: "Still the same error! I don't understand what's happening. This is incredibly frustrating." },
  { senderType: SenderType.agent, authorId: agent.id, body: `I completely understand your frustration, Jane, and I sincerely apologise.\n\nI'm looking at your account right now. I can see the password hash was updated successfully. However, I notice your account has a secondary email verification flag that may be blocking login. I'm going to manually clear that flag.\n\nPlease try again now.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Tried again. Still blocked. The error message is the same." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Thank you for your patience, Jane.\n\nI've now checked with our backend engineer and we believe the issue is related to a stale session token in our Redis cache that's overriding the new password hash. We're flushing the cache entry for your account now — this takes about 2 minutes.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "OK, I'll wait." },
  { senderType: SenderType.agent, authorId: agent.id, body: `The cache has been flushed. Could you please try logging in now?\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "IT WORKED! I'm in! Oh my goodness, finally. Thank you so much!" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Wonderful news, Jane! I'm so glad we got that sorted out.\n\nI'm going to file an internal bug report about the Redis cache issue so this doesn't happen to other users. I apologise again for the trouble this caused.\n\nIs there anything else I can help you with today?\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Actually yes — I need to download invoices from January through March. Where do I find those?" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Of course! To access your invoices:\n\n1. Click your profile icon in the top-right corner\n2. Select "Billing & Invoices" from the dropdown\n3. Use the date filter to select Jan–Mar\n4. Click "Download" next to each invoice, or "Download All" to get them as a ZIP\n\nLet me know if you run into any issues!\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "I can see January and February but March isn't there. My billing date is the 28th so maybe the March invoice hasn't been generated yet?" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Good catch! Yes — your billing cycle runs on the 28th of each month. The March invoice will be generated on March 28th and will appear in your billing portal within a few hours of generation.\n\nIf you need the invoice before then for your audit, I can generate a pro-forma invoice manually. Would that help?\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Yes please, a pro-forma would be really helpful. The audit is this Friday." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Understood — I'll generate the pro-forma invoice now. It will reflect charges up to today's date.\n\nCould you confirm the billing address you'd like on the invoice?\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Smith Consulting Ltd, 42 Baker Street, London, EC1A 1BB, United Kingdom. VAT number: GB123456789." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Perfect. I've generated the pro-forma invoice and attached it to this ticket. You should also receive a copy by email within the next few minutes.\n\nInvoice reference: PRO-2024-0892\nAmount: £349.00 + VAT\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Got the email. The invoice looks correct. Thank you!" },
  { senderType: SenderType.agent, authorId: agent.id, body: `You're very welcome, Jane. I'm glad we could get everything sorted for your audit.\n\nIs there anything else I can help with?\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "One more thing — I'd like to enable two-factor authentication so this login issue doesn't happen again. How do I set that up?" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Great idea! Here's how to enable 2FA:\n\n1. Go to Settings → Security\n2. Click "Enable Two-Factor Authentication"\n3. Choose your preferred method: Authenticator App (recommended) or SMS\n4. Follow the setup wizard\n\nI recommend an authenticator app like Google Authenticator or Authy for better security.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "I've set it up with Google Authenticator. Works great. Thanks for the tip!" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Excellent! You're all set. Your account is now much more secure.\n\nDon't forget to save your backup codes somewhere safe — you'll need them if you ever lose access to your phone.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Done, saved them in my password manager. Is there anything else I should do to secure my account?" },
  { senderType: SenderType.agent, authorId: agent.id, body: `A few recommendations:\n\n- Review active sessions under Settings → Security → Active Sessions and revoke any you don't recognise\n- Make sure your recovery email is up to date\n- Consider using a unique, strong password (your password manager can generate one)\n\nYou seem to be on top of security already!\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "All done. I revoked three old sessions I didn't recognise. Good to know that feature exists!" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Glad to hear it — those were likely old browser sessions from devices you no longer use. Revoking them was the right call.\n\nIs there anything else on your mind?\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Actually, while I have you — I'm thinking of upgrading our plan from Professional to Business. Can you tell me what's included?" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Of course! The Business plan includes everything in Professional plus:\n\n- Up to 25 users (vs 5 on Professional)\n- Priority support (4-hour SLA vs 24-hour)\n- Advanced analytics and reporting\n- SSO/SAML integration\n- Custom roles and permissions\n- Dedicated account manager\n\nPricing is £799/month billed annually or £899/month month-to-month. Would you like me to connect you with our sales team for a formal quote?\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Yes please, a formal quote would be great. We're a team of 12 so we'd definitely need the higher user limit." },
  { senderType: SenderType.agent, authorId: agent.id, body: `I've passed your details to our sales team. You should receive a personalised quote within 1 business day. Your account manager will be Sarah Chen (sarah.chen@example.com) — she'll be able to walk you through the upgrade process and any migration considerations.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "That's brilliant. Thank you for all your help today. You've been incredibly patient and thorough." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Thank you for the kind words, Jane — it means a lot!\n\nI'll mark this ticket as resolved now. If you need anything else, don't hesitate to open a new ticket or reply here.\n\nWishing you a successful audit on Friday!\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Thank you! One last question — is there a mobile app? I travel a lot and it would be useful." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Yes! We have iOS and Android apps:\n\n- iOS: Search "Example App" on the App Store\n- Android: Search "Example App" on Google Play\n\nBoth apps support 2FA and biometric login. They're kept in sync with the web app in real time.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Perfect. Just downloaded it on my iPhone. Works seamlessly. Really happy with the product overall." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Wonderful to hear! Enjoy the app on your travels.\n\nThank you again for your patience today, Jane. Take care!\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Will do. Bye!" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Goodbye, Jane! Have a great rest of your week.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Oh wait — one more thing. I just noticed my company name on the account profile says 'Smith Consulting' but it should be 'Smith Consulting Ltd'. Can I change that?" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Of course! You can update it yourself:\n\n1. Go to Settings → Account\n2. Click "Edit" next to Company Name\n3. Update to "Smith Consulting Ltd"\n4. Click Save\n\nChanges take effect immediately.\n\nBest,\n${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Done! Much better. OK, I think that's everything. Really appreciate all the help." },
  { senderType: SenderType.agent, authorId: agent.id, body: `Happy to help, Jane! Everything is all sorted.\n\nWishing you all the best with the audit and the potential plan upgrade. Feel free to reach out any time.\n\nTake care!\n\n— ${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Will do. Thanks again, bye!" },
  { senderType: SenderType.agent, authorId: agent.id, body: `Goodbye! 👋\n\n— ${agent.name}` },
  { senderType: SenderType.customer, authorId: null, body: "Just confirming — I received the formal quote from Sarah Chen and it looks good. We'll probably upgrade next week." },
  { senderType: SenderType.agent, authorId: agent.id, body: `That's great news, Jane! Sarah will guide you through the whole process. I'll make a note on your account.\n\nEnjoy the Business plan features when you upgrade!\n\nBest,\n${agent.name}` },
];

// Create all 50 replies with staggered timestamps
const baseTime = new Date(ticket.createdAt.getTime() + 5 * 60 * 1000); // 5 min after ticket
for (let i = 0; i < conversation.length; i++) {
  const { body, senderType, authorId } = conversation[i];
  const createdAt = new Date(baseTime.getTime() + i * 8 * 60 * 1000); // 8 min apart
  await prisma.reply.create({
    data: {
      body,
      senderType,
      ticketId: ticket.id,
      authorId,
      createdAt,
    },
  });
}

console.log(`Created ${conversation.length} replies for ticket ${ticket.id}`);

await prisma.$disconnect();
