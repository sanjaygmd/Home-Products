import twilio from 'twilio';
import dotenv from 'dotenv'

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH
);

export const sendSmsOtp = async (phone, otp) => {
  await client.messages.create({
    body: `Your OTP is ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_PHONE,
    to: phone,
  });
};