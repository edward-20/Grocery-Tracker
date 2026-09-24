import { Resend } from "resend";

export async function sendEmail(
  subject: string,
  message: string,
  recipientEmail: string,
  domain: string,
  resend: Resend
): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: `Grocery Tracker <scraper@${domain}>`,
    to: recipientEmail,
    subject,
    text: message,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log(`Email sent: ${data?.id}`);
}
