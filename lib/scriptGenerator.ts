import { MemberAnalysis } from './analyzer';

export interface MemberScript {
  memberId: number | string;
  memberName: string;
  action: string;
  emailScript: string;
  callScript: string;
  contactMethod: 'email' | 'phone' | 'both';
  contactInfo: {
    email?: string;
    phone?: string;
  };
}

export function generateScriptForMember(member: MemberAnalysis): MemberScript {
  const gymName = 'Our Gym'; // Could be configurable later

  let emailScript = '';
  let callScript = '';

  switch (member.onboarding_stage) {
    case 'welcome':
      emailScript = generateWelcomeEmail(member, gymName);
      callScript = generateWelcomeCall(member, gymName);
      break;

    case 'day7':
      emailScript = generateDay7Email(member, gymName);
      callScript = generateDay7Call(member, gymName);
      break;

    case 'day30':
      emailScript = generateDay30Email(member, gymName);
      callScript = generateDay30Call(member, gymName);
      break;

    case 'return_incentive':
      emailScript = generateReturnIncentiveEmail(member, gymName);
      callScript = generateReturnIncentiveCall(member, gymName);
      break;

    case 'day90':
      emailScript = generateDay90Email(member, gymName);
      callScript = generateDay90Call(member, gymName);
      break;

    default:
      emailScript = 'No action needed.';
      callScript = 'Member is fully onboarded.';
  }

  const contactMethod = member.email && member.phone ? 'both' : member.email ? 'email' : member.phone ? 'phone' : 'email';

  return {
    memberId: member.id ?? 0,
    memberName: member.name,
    action: member.action_needed,
    emailScript,
    callScript,
    contactMethod,
    contactInfo: {
      email: member.email,
      phone: member.phone,
    },
  };
}

function generateWelcomeEmail(member: MemberAnalysis, gymName: string): string {
  return `Subject: Welcome to ${gymName}, ${member.name}!

Hi ${member.name},

Welcome to ${gymName}! We're thrilled to have you join our community.

Your membership is now active, and you have full access to all our facilities and classes. We're here to help you get the most out of your membership.

Here are a few tips to get started:
• Download our app for class bookings and check class schedules
• Don't hesitate to ask our staff for a tour or equipment guidance
• We offer a free orientation session if you'd like one

Looking forward to seeing you soon!

Best regards,
The ${gymName} Team`;
}

function generateWelcomeCall(member: MemberAnalysis, gymName: string): string {
  return `Call Script - Welcome (Day 1):

Hi ${member.name}, I'm calling from ${gymName}. I wanted to personally welcome you to our gym!

I see you just joined us - that's fantastic. I'm calling to:
✓ Make sure you've received all the login info and app access
✓ See if you have any quick questions about our facilities
✓ Let you know about our orientation session if you'd like one

How are you getting on so far?`;
}

function generateDay7Email(member: MemberAnalysis, gymName: string): string {
  return `Subject: How's your first week going at ${gymName}?

Hi ${member.name},

One week in - how are you getting on? We hope you're settling in well!

This is a good time to reach out if you have any questions about:
• Using our equipment
• Booking classes
• Our membership benefits
• Anything else we can help with

Feel free to reply to this email or give us a call. We're here to support you!

Best,
The ${gymName} Team`;
}

function generateDay7Call(member: MemberAnalysis, gymName: string): string {
  return `Call Script - Day 7 Check-in:

Hi ${member.name}, it's [Your Name] from ${gymName}. Just checking in after your first week with us!

Quick question: Have you had a chance to come by yet? If so, what do you think of the place?

Is there anything we can help with to get you more comfortable - equipment questions, class recommendations, etc.?`;
}

function generateDay30Email(member: MemberAnalysis, gymName: string): string {
  return `Subject: Your first month at ${gymName} - let's check in!

Hi ${member.name},

You've now been a member for a month - congratulations! This is a great milestone.

We'd love to hear how your first month has been:
• Have you found your favorite classes or workout routine?
• Are you seeing progress toward your fitness goals?
• Is there anything we could improve for your experience?

Let's set up a quick progress check call this week. Reply to this email to schedule a time that works for you.

Talk soon,
The ${gymName} Team`;
}

function generateDay30Call(member: MemberAnalysis, gymName: string): string {
  return `Call Script - Day 30 Progress Check:

Hi ${member.name}, I'm calling to check in on your first month with us at ${gymName}.

I'd love to chat for a few minutes about:
✓ How your fitness journey is going so far
✓ Any goals you've hit or are working toward
✓ Classes or equipment you're enjoying
✓ Anything we could do better for you

Also - we offer free personal training consultations if you'd like a customized plan. Would that interest you?`;
}

function generateReturnIncentiveEmail(member: MemberAnalysis, gymName: string): string {
  return `Subject: We miss you, ${member.name}! Free offer inside 🎁

Hi ${member.name},

We've noticed it's been a while since we've seen you at ${gymName}, and we want to help you get back on track.

We'd love to have you back - and as an incentive, we'd like to offer you:
🎁 A FREE 30-minute personal training session with one of our trainers

This is your chance to:
• Get refreshed on your fitness goals
• Learn new workout techniques
• Build a fresh routine to restart your membership

How does next week look? Just reply to schedule your session.

Looking forward to seeing you soon,
The ${gymName} Team`;
}

function generateReturnIncentiveCall(member: MemberAnalysis, gymName: string): string {
  return `Call Script - Return Incentive:

Hi ${member.name}, it's [Your Name] from ${gymName}. I'm reaching out because we miss you!

I know life gets busy, and sometimes our fitness routine takes a back seat. I wanted to offer you something special to help you get back:

🎁 We'd like to give you a FREE 30-minute PT session with our trainer.

This is a great way to reset, clarify your goals, and get back into a routine that works for you.

What's your schedule looking like next week? Let's get you back on track!`;
}

function generateDay90Email(member: MemberAnalysis, gymName: string): string {
  return `Subject: You're a valued ${gymName} member - here's what's next

Hi ${member.name},

It's hard to believe you've been with us for 90 days! That's fantastic. By now, hopefully our gym feels like a second home.

We wanted to take a moment to:
✓ Thank you for being part of our community
✓ Celebrate the progress you've made so far
✓ Talk about where you'd like to take your fitness next

Whether it's upgrading to premium services, joining a challenge, or exploring personal training, we're here to support your goals.

Let's schedule a quick call this week to discuss your next steps. Reply to book a time.

Thanks for being awesome,
The ${gymName} Team`;
}

function generateDay90Call(member: MemberAnalysis, gymName: string): string {
  return `Call Script - 90 Day Check-in:

Hi ${member.name}, it's [Your Name] from ${gymName}. I'm calling to congratulate you - you've been a member for 90 days!

That's a huge milestone, and we want to make sure you're getting the most out of your membership.

Quick question for you: Looking back at your first three months, what's been your favorite part? What results are you seeing?

Also - now that you've settled in, would you be interested in exploring any of our premium services like personal training or group coaching? Let's chat about what would help you reach your next fitness milestone.`;
}
