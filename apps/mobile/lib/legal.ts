export interface LegalDoc { title: string; sections: { h: string; p: string }[] }
const PENDING = '[Pending legal review] This text is a working draft and is not yet final.';

export const LEGAL: Record<string, LegalDoc> = {
  terms: {
    title: 'Terms of service',
    sections: [
      { h: 'About help', p: PENDING + ' help is a marketplace that lets customers discover independent professionals. help is not the employer of any professional and does not perform the services.' },
      { h: 'Your account', p: 'One account can act as a customer and as a professional. You are responsible for keeping your sign-in methods secure and for the accuracy of the information you provide.' },
      { h: 'Contacting professionals', p: 'help is a directory. Any agreement, price or payment is between you and the professional. help does not take bookings or payments for services. Customers use help free of charge.' },
      { h: 'Professional subscriptions', p: 'Professionals pay a subscription to be listed and to receive new enquiries. Plans renew until cancelled. A profile is visible only while the plan is active, subject to a short grace period after a failed payment.' },
      { h: 'Conduct', p: 'Do not post false information, harass others, or take payments or contact outside the rules of the app in order to avoid safety checks. We may suspend accounts that put others at risk.' },
      { h: 'Changes', p: 'We may update these terms. We will tell you in the app before material changes take effect.' },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    sections: [
      { h: 'What we collect', p: PENDING + ' Account details (name, phone, email), your approximate location while you search, chat message content, and device information needed for sign-in and notifications.' },
      { h: 'How we use it', p: 'To run your account, match you with professionals, send status, message and safety notifications, prevent fraud and provide support.' },
      { h: 'What others can see', p: 'A professional’s phone number is shown only to signed-in customers, and only if the professional allows it. Public profiles never show a professional’s private phone, email or home address.' },
      { h: 'Your rights', p: 'You can view and export your data and delete your account from Profile, Privacy and data. Some records, such as payment history, may be kept where the law requires.' },
      { h: 'Payments', p: 'Card and bank details are handled by Razorpay. help never stores them.' },
    ],
  },
  refunds: {
    title: 'Refund and cancellation policy',
    sections: [
      { h: 'Customers', p: PENDING + ' Customers do not pay help, so there is nothing to refund from help. Payment for work is agreed directly with the professional.' },
      { h: 'Professional subscriptions', p: 'You can turn off renewal at any time from Settings. Your plan stays active until the end of the period you already paid for. Payments already made are not refunded for unused time unless required by law or approved by support.' },
      { h: 'Failed or duplicate payments', p: 'If you were charged but your plan did not activate, create a Payment ticket in Support and we will reconcile it.' },
    ],
  },
  grievance: {
    title: 'Grievance redressal',
    sections: [
      { h: 'How to raise a concern', p: PENDING + ' Open Help centre, then Contact support, and choose the topic that fits. Every ticket gets a number you can track in the app.' },
      { h: 'Grievance officer', p: 'Details of the grievance officer will be published here before launch.' },
      { h: 'Response time', p: 'We aim to acknowledge every complaint within 48 hours and resolve it within 30 days.' },
    ],
  },
};
